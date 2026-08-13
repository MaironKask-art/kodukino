'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';

// Supabase ühendus
const SUPABASE_URL = 'https://hpfpicspqnfnobfolvjf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Uhc4FgN-m_Ic89xw31dyRg_8EjVxRau';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Home() {
  const tananeKuupaev = new Date().toISOString().split('T')[0];

  // DÜNAAMILISED BÄNNERID (laetakse Supabase'ist)
  const [bannerid, setBannerid] = useState([]);

  // SEANSSID (laetakse Supabase'ist)
  const [seansid, setSeansid] = useState([]);

  const [aktiivneBanner, setAktiivneBanner] = useState(0);
  const [valitudSeanss, setValitudSeanss] = useState(null);
 
  // Navigatsiooni olek ('kava' | 'piletid' | 'admin')
  const [aktiivneVaade, setAktiivneVaade] = useState('kava');
  const [valitudKuupaevFiltri, setValitudKuupaevFiltri] = useState(tananeKuupaev);

  // Minu Piletid
  const [minuPiletid, setMinuPiletid] = useState([]);

  // Broneerimise olekud
  const [naitaSaaliPlaani, setNaitaSaaliPlaani] = useState(false);
  const [valitudKohad, setValitudKohad] = useState([]);
  const [hoivatudKohad, setHoivatudKohad] = useState([]);

  // Admini olekud
  const [onAutenditud, setOnAutenditud] = useState(false);
  const [sisestatudParool, setSisestatudParool] = useState('');
  const [parooliViga, setParooliViga] = useState(false);

  // Uue seansi vorm
  const [uusSeanss, setUusSeanss] = useState({
    pealkiri: '', zanr: '', vanusepiirang: 'Pere', kuupaev: tananeKuupaev, algusAeg: '18:00', loppAeg: '20:00',
    saal: '', saaliSuurus: '1x2', keel: 'Eesti keeles', subtiitrid: 'Eesti', kirjeldus: '', piltUrl: '', treilerUrl: ''
  });

  const [uusBanner, setUusBanner] = useState({
    pealkiri: '', tyyp: 'Kampaania', piltUrl: '', varv: 'bg-gradient-to-r from-purple-900 to-indigo-900'
  });

  // 1. LAE SEANSSID JA BÄNNERID SUPABASE'IST
  useEffect(() => {
    laeSeansid();
    laeBannerid();
  }, []);

  const laeSeansid = async () => {
    const { data, error } = await supabase.from('seansid').select('*');
    if (!error && data && data.length > 0) {
      // Teisendame andmebaasi väljad koodi kujule
      const kohandatudData = data.map(s => ({
        ...s,
        algusAeg: s.algus_aeg || s.algusAeg || '18:00',
        loppAeg: s.lopp_aeg || s.loppAeg || '20:00',
        piltUrl: s.pilt_url || s.piltUrl || '',
        treilerUrl: s.treiler_url || s.treilerUrl || '',
        kohtiRias: s.kohti_rias || s.kohtiRias || 2
      }));
      setSeansid(kohandatudData);
    } else {
      setSeansid([
        {
          id: 's-1',
          pealkiri: 'Lego Film 3',
          zanr: 'Animatsioon, Pere',
          vanusepiirang: 'Pere',
          kuupaev: tananeKuupaev,
          algusAeg: '12:00',
          loppAeg: '13:40',
          saal: 'saal 1 (väike)',
          ridu: 1,
          kohtiRias: 2,
          keel: 'Eesti keeles',
          subtiitrid: 'Puuduvad',
          kirjeldus: 'Lõbus ja värviline seiklus kogu perele.',
          piltUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
          treilerUrl: 'https://www.youtube.com/watch?v=fCoK-4-eG_U',
          piletiHind: 7.50
        }
      ]);
    }
  };

  const laeBannerid = async () => {
    const { data, error } = await supabase.from('bannerid').select('*');
    if (!error && data && data.length > 0) {
      const kohandatudData = data.map(b => ({
        ...b,
        piltUrl: b.pildi_url || b.piltUrl || ''
      }));
      setBannerid(kohandatudData);
    } else {
      setBannerid([
        { id: 1, pealkiri: "SUUR KAMPAANIA: Klubilistele popkorn poole soodsamalt!", tyyp: "Kampaania", varv: "bg-gradient-to-r from-purple-900 to-indigo-900", piltUrl: "" },
        { id: 2, pealkiri: "TULEKUL: Kosmiline Odüsseia 2026 – Esilinastus juba juunis!", tyyp: "Uus Film", varv: "bg-gradient-to-r from-amber-900 to-red-950", piltUrl: "" }
      ]);
    }
  };

  // Lae kasutaja piletid LocalStorage'ist
  useEffect(() => {
    const salvestatud = localStorage.getItem('minu_kino_piletid');
    if (salvestatud) {
      try { setMinuPiletid(JSON.parse(salvestatud)); } catch (e) {}
    }
  }, []);

  // Automaatne bännerite vahetumine
  useEffect(() => {
    if (bannerid.length <= 1) return;
    const taimer = setInterval(() => {
      setAktiivneBanner((prev) => (prev + 1) % bannerid.length);
    }, 7000);
    return () => clearInterval(taimer);
  }, [bannerid.length]);

  // Reaalaja broneeringud
  useEffect(() => {
    if (!valitudSeanss) return;
    const laeBroneeringud = async () => {
      const { data } = await supabase.from('broneeringud').select('koht_kood').eq('seanss_id', valitudSeanss.id);
      if (data) setHoivatudKohad(data.map(item => item.koht_kood));
    };
    laeBroneeringud();

    const kanal = supabase.channel('reaalaja-broneeringud')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broneeringud', filter: `seanss_id=eq.${valitudSeanss.id}` },
      (payload) => setHoivatudKohad((prev) => [...prev, payload.new.koht_kood]))
      .subscribe();

    return () => { supabase.removeChannel(kanal); };
  }, [valitudSeanss]);

  // Admin parooli kontroll
  const kontrolliParooli = (e) => {
    e.preventDefault();
    if (sisestatudParool === '1234') {
      setOnAutenditud(true);
      setParooliViga(false);
      setSisestatudParool('');
    } else {
      setParooliViga(true);
    }
  };

  // 2. SALVESTA SEANSS SUPABASE'I
  const lisaSeanss = async (e) => {
    e.preventDefault();
    if (!uusSeanss.pealkiri) return;
    const [ridu, kohtiRias] = uusSeanss.saaliSuurus.split('x').map(Number);
   
    const seansiId = `s-${Date.now()}`;

    // Supabase jaoks mõeldud andmeobjekt (Sobitatud veergude nimedega)
    const dbObjekt = {
      id: seansiId,
      pealkiri: uusSeanss.pealkiri,
      zanr: uusSeanss.zanr,
      vanusepiirang: uusSeanss.vanusepiirang,
      kuupaev: uusSeanss.kuupaev,
      algus_aeg: uusSeanss.algusAeg,
      lopp_aeg: uusSeanss.loppAeg,
      saal: uusSeanss.saal,
      ridu: ridu || 1,
      kohti_rias: kohtiRias || 2,
      keel: uusSeanss.keel,
      subtiitrid: uusSeanss.subtiitrid,
      kirjeldus: uusSeanss.kirjeldus,
      pilt_url: uusSeanss.piltUrl,
      treiler_url: uusSeanss.treilerUrl,
    };

    // Kohalik olekuobjekt koodi jaoks
    const koodiObjekt = {
      ...uusSeanss,
      id: seansiId,
      ridu: ridu || 1,
      kohtiRias: kohtiRias || 2,
    };

    // Saadame Supabase'i
    const { error } = await supabase.from('seansid').insert([dbObjekt]);

    if (error) {
      console.error('Viga seansi salvestamisel Supabase-i:', error.message);
      alert('Viga salvestamisel: ' + error.message);
      return;
    }

    const uued = [...seansid, koodiObjekt].sort((a, b) => (a.kuupaev + a.algusAeg).localeCompare(b.kuupaev + b.algusAeg));
    setSeansid(uued);

    setUusSeanss({ pealkiri: '', zanr: '', vanusepiirang: 'Pere', kuupaev: tananeKuupaev, algusAeg: '18:00', loppAeg: '20:00', saal: 'Saal 1', saaliSuurus: '1x2', keel: 'Eesti keeles', subtiitrid: 'Eesti', kirjeldus: '', piltUrl: '', treilerUrl});
    alert('Uus seanss edukalt lisatud ja salvestatud Supabase-i!');
  };

  // 3. SALVESTA BÄNNER SUPABASE'I
  const lisaBanner = async (e) => {
    e.preventDefault();
    if (!uusBanner.pealkiri) return;
   
    const dbBanner = { 
      pealkiri: uusBanner.pealkiri, 
      tyyp: uusBanner.tyyp, 
      pildi_url: uusBanner.piltUrl, 
      varv: uusBanner.varv 
    };
   
    const { error } = await supabase.from('bannerid').insert([dbBanner]);

    if (error) {
      console.error('Viga bänneri salvestamisel:', error.message);
      alert('Viga bänneri salvestamisel: ' + error.message);
      return;
    }

    setBannerid([...bannerid, { id: Date.now(), ...uusBanner }]);
    setUusBanner({ pealkiri: '', tyyp: 'Kampaania', piltUrl: '', varv: 'bg-gradient-to-r from-purple-900 to-indigo-900' });
    alert('Uus bänner edukalt lisatud Supabase-i!');
  };

  // 4. KUSTUTA BÄNNER SUPABASE'IST
  const kustutaBanner = async (id) => {
    if (bannerid.length <= 1) return alert('Vähemalt 1 bänner peab alles jääma!');
    const { error } = await supabase.from('bannerid').delete().eq('id', id);
    if (error) {
      console.error('Viga bänneri kustutamisel:', error.message);
    }
    setBannerid(bannerid.filter(b => b.id !== id));
    setAktiivneBanner(0);
  };

  // 5. KUSTUTA SEANSS SUPABASE'IST
  const kustutaSeanss = async (id) => {
    if (confirm('Kas oled kindel, et soovid selle seansi kustutada?')) {
      const { error } = await supabase.from('seansid').delete().eq('id', id);
      if (error) {
        console.error('Viga seansi kustutamisel:', error.message);
      }
      setSeansid(seansid.filter(s => s.id !== id));
    }
  };

  // KUSTUTA PILET KÄSITSI
  const kustutaPilet = (kood) => {
    if (confirm('Kas oled kindel, et soovid selle pileti kustutada?')) {
      const uuedPiletid = minuPiletid.filter(p => p.piletiKood !== kood);
      setMinuPiletid(uuedPiletid);
      localStorage.setItem('minu_kino_piletid', JSON.stringify(uuedPiletid));
    }
  };

  const validaKoht = (rida, koht) => {
    const kood = `${rida}-${koht}`;
    if (hoivatudKohad.includes(kood)) return;
    setValitudKohad(valitudKohad.includes(kood) ? valitudKohad.filter(k => k !== kood) : [...valitudKohad, kood]);
  };

  // 6. KINNITA BRONEERING JA SALVESTA SUPABASE'I
  const kinnitaBroneering = async () => {
    if (valitudKohad.length === 0) return;

    const uuedRead = valitudKohad.map(kood => ({
      seanss_id: valitudSeanss.id,
      koht_kood: kood
    }));

    const { error } = await supabase.from('broneeringud').insert(uuedRead);

    if (error) {
      alert('Viga broneerimisel: ' + error.message);
    } else {
     
      const uusPilet = {
        piletiKood: `KINO-${Math.floor(100000 + Math.random() * 900000)}`,
        seanss: valitudSeanss.pealkiri,
        saal: valitudSeanss.saal,
        aeg: `${valitudSeanss.kuupaev} (${valitudSeanss.algusAeg} - ${valitudSeanss.loppAeg})`,
        kohad: [...valitudKohad],
        kuupaev: new Date().toLocaleDateString('et-EE')
      };

      const uuedPiletid = [uusPilet, ...minuPiletid];
      setMinuPiletid(uuedPiletid);
      localStorage.setItem('minu_kino_piletid', JSON.stringify(uuedPiletid));

      alert(`Broneering kinnitatud!\nPilet salvestatud vaatesse "Minu Piletid".`);
      setValitudKohad([]);
      setNaitaSaaliPlaani(false);
      setValitudSeanss(null);
      setAktiivneVaade('piletid');
    }
  };

  const kavasOlevadKuupaevad = Array.from(new Set(seansid.map(s => s.kuupaev))).sort();

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans">
     
      {/* Päis */}
      <header className="bg-black py-4 px-8 flex justify-between items-center border-b border-gray-800 sticky top-0 z-40">
        <div
          className="text-2xl font-black tracking-wider text-[#ffcc00] cursor-pointer"
          onClick={() => { setAktiivneVaade('kava'); setNaitaSaaliPlaani(false); setValitudSeanss(null); }}
        >
          KODUKINO
        </div>
        <nav className="flex space-x-6 items-center">
          <button
            onClick={() => { setAktiivneVaade('kava'); setNaitaSaaliPlaani(false); setValitudSeanss(null); }}
            className={`font-bold transition ${aktiivneVaade === 'kava' ? 'text-[#ffcc00] border-b-2 border-[#ffcc00] pb-1' : 'text-gray-300 hover:text-white'}`}
          >
            Kava
          </button>
         
          <button
            onClick={() => { setAktiivneVaade('piletid'); setNaitaSaaliPlaani(false); setValitudSeanss(null); }}
            className={`font-bold transition flex items-center gap-1.5 ${aktiivneVaade === 'piletid' ? 'text-[#ffcc00] border-b-2 border-[#ffcc00] pb-1' : 'text-gray-300 hover:text-white'}`}
          >
            🎫 Minu Piletid
            {minuPiletid.length > 0 && (
              <span className="bg-[#ffcc00] text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {minuPiletid.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setAktiivneVaade('admin'); setNaitaSaaliPlaani(false); setValitudSeanss(null); }}
            className={`px-4 py-2 rounded text-sm transition border ${aktiivneVaade === 'admin' ? 'bg-[#ffcc00] text-black border-[#ffcc00] font-bold' : 'bg-[#262626] text-white border-gray-700 hover:bg-gray-800'}`}
          >
            {aktiivneVaade === 'admin' ? 'Sulge Admin' : '🔒 Admin'}
          </button>
        </nav>
      </header>

      {/* 1. VAADE: MINU PILETID */}
      {aktiivneVaade === 'piletid' && (
        <section className="p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-[#ffcc00] border-l-4 border-[#ffcc00] pl-3">
            🎫 Minu Ostetud Piletid
          </h2>

          {minuPiletid.length === 0 ? (
            <div className="bg-[#262626] p-12 text-center rounded-2xl border border-gray-800 text-gray-400">
              <p className="text-lg mb-4">Sul ei ole veel ühtegi broneeritud piletit.</p>
              <button
                onClick={() => setAktiivneVaade('kava')}
                className="bg-[#ffcc00] text-black font-bold px-6 py-2.5 rounded-lg hover:bg-yellow-400 transition"
              >
                Vaata kava ja vali film
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {minuPiletid.map((pilet, idx) => (
                <div key={idx} className="bg-[#262626] border border-gray-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#ffcc00] text-black font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">KEHTIV PILET</span>
                      <span className="text-xs text-gray-400">Ostetud: {pilet.kuupaev}</span>
                    </div>

                    <h3 className="text-2xl font-black text-white">{pilet.seanss}</h3>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 pt-2">
                      <div><span className="text-gray-500">Aeg / Kuupäev:</span> <strong className="text-[#ffcc00]">{pilet.aeg}</strong></div>
                      <div><span className="text-gray-500">Saal:</span> <strong>{pilet.saal}</strong></div>
                      <div><span className="text-gray-500">Kohad:</span> <strong className="text-white bg-zinc-800 px-2 py-0.5 rounded border border-gray-700">{pilet.kohad.join(', ')}</strong></div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[10px] text-gray-500">Piletikood: {pilet.piletiKood}</p>
                      <button
                        onClick={() => kustutaPilet(pilet.piletiKood)}
                        className="text-xs bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 font-bold px-3 py-1 rounded transition"
                      >
                        🗑️ Kustuta pilet
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border-2 border-[#ffcc00] flex flex-col items-center justify-center text-center">
                    <QRCodeSVG value={`PILET:${pilet.piletiKood}|SEANSS:${pilet.seanss}|KOHAD:${pilet.kohad.join(',')}`} size={110} />
                    <span className="text-[9px] font-bold text-black mt-1">SKÄNNI KONTROLLIKS</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. VAADE: ADMIN PANEEL */}
      {aktiivneVaade === 'admin' && (
        <section className="p-8 max-w-4xl mx-auto space-y-8">
          {!onAutenditud ? (
            <div className="bg-[#262626] p-8 rounded-2xl border border-gray-700 shadow-xl text-center max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-[#ffcc00]">🔒 Admini Sisenemine</h2>
             
              <form onSubmit={kontrolliParooli} className="space-y-4">
                <input
                  type="password"
                  placeholder="Sisesta admini parool"
                  value={sisestatudParool}
                  onChange={(e) => setSisestatudParool(e.target.value)}
                  className="w-full bg-zinc-800 border border-gray-700 rounded p-3 text-white text-center focus:outline-none focus:border-[#ffcc00]"
                />
                {parooliViga && <p className="text-red-500 text-xs font-bold">Vale parool! Proovi uuesti.</p>}
                <button type="submit" className="w-full bg-[#ffcc00] text-black font-extrabold py-3 rounded hover:bg-yellow-400 transition">
                  Sisene Admini Paneeli
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* KAMPAANIATE HALDAMINE */}
              <div className="bg-[#262626] p-6 rounded-2xl border border-gray-700 shadow-xl">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
                  <h2 className="text-xl font-bold text-[#ffcc00]">📢 Halda Bännereid ja Kampaaniaid</h2>
                  <button onClick={() => setOnAutenditud(false)} className="text-xs text-red-400 hover:underline">Logi välja</button>
                </div>
               
                <form onSubmit={lisaBanner} className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" required placeholder="Bänneri pealkiri" value={uusBanner.pealkiri} onChange={(e) => setUusBanner({...uusBanner, pealkiri: e.target.value})} className="bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                    <select value={uusBanner.tyyp} onChange={(e) => setUusBanner({...uusBanner, tyyp: e.target.value})} className="bg-zinc-800 border border-gray-700 rounded p-2.5 text-white">
                      <option value="Kampaania">Kampaania</option>
                      <option value="Reklaam">Reklaam</option>
                      <option value="Uus Film">Uus Film</option>
                    </select>
                  </div>
                  <input type="url" placeholder="Taustapildi URL (valikuline)" value={uusBanner.piltUrl} onChange={(e) => setUusBanner({...uusBanner, piltUrl: e.target.value})} className="w-full bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                  <button type="submit" className="w-full bg-[#ffcc00] text-black font-extrabold py-2.5 rounded hover:bg-yellow-400 transition">+ Lisa bänner</button>
                </form>

                <div className="space-y-2">
                  {bannerid.map((b) => (
                    <div key={b.id} className="flex justify-between items-center bg-zinc-800 p-2.5 rounded border border-gray-700 text-xs">
                      <div><span className="bg-[#ffcc00] text-black px-1.5 py-0.5 rounded font-bold mr-2">{b.tyyp}</span><span className="font-bold text-white">{b.pealkiri}</span></div>
                      <button onClick={() => kustutaBanner(b.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded transition">Kustuta</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEANSSIDE HALDAMINE */}
              <div className="bg-[#262626] p-6 rounded-2xl border border-gray-700 shadow-xl">
                <h2 className="text-xl font-bold text-[#ffcc00] mb-4 border-b border-gray-700 pb-3">🛠️ Lisa Uus Seanss</h2>
                <form onSubmit={lisaSeanss} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" required placeholder="Filmi pealkiri" value={uusSeanss.pealkiri} onChange={(e) => setUusSeanss({...uusSeanss, pealkiri: e.target.value})} className="bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                    <input type="text" placeholder="Žanr (nt Draama, Märul)" value={uusSeanss.zanr} onChange={(e) => setUusSeanss({...uusSeanss, zanr: e.target.value})} className="bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                  </div>
                  
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Saal:</label>
                    <input
                      type="text"
                      placeholder="nt Saal 1 või VIP"
                      value={uusSeanss.saal}
                      onChange={(e) => setUusSeanss({...uusSeanss, saal: e. target.value})}
                      classname="w-full bg-zinc-800 border-gray-700 rounded p-2.5 text-white text-xs"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Seansi kuupäev:</label>
                      <input
                        type="date"
                        required
                        value={uusSeanss.kuupaev}
                        onChange={(e) => setUusSeanss({...uusSeanss, kuupaev: e.target.value})}
                        className="w-full bg-zinc-800 border border-gray-700 rounded p-2.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Vanusepiirang:</label>
                      <select
                        value={uusSeanss.vanusepiirang}
                        onChange={(e) => setUusSeanss({...uusSeanss, vanusepiirang: e.target.value})}
                        className="w-full bg-zinc-800 border border-gray-700 rounded p-2.5 text-white"
                      >
                        <option value="Pere">Pere (Lastele/Kõigile)</option>
                        <option value="MS-6">MS-6 (Mittesoovitatav alla 6. a)</option>
                        <option value="K-12">K-12 (Keelatud alla 12. a)</option>
                        <option value="K-14">K-14 (Keelatud alla 14. a)</option>
                        <option value="K-16">K-16 (Keelatud alla 16. a)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Saali maht:</label>
                      <select value={uusSeanss.saaliSuurus} onChange={(e) => setUusSeanss({...uusSeanss, saaliSuurus: e.target.value})} className="w-full bg-zinc-800 border border-gray-700 rounded p-2.5 text-white">
                        <option value="1x2">1x2 (2 kohta)</option>
                        <option value="1x3">1x3 (3 kohta)</option>
                        <option value="1x4">1x4 (4 kohta)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Filmi keel:</label>
                      <input type="text" placeholder="nt Eesti keeles, Inglise" value={uusSeanss.keel} onChange={(e) => setUusSeanss({...uusSeanss, keel: e.target.value})} className="w-full bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Subtiitrid:</label>
                      <input type="text" placeholder="nt Eesti, Vene, Puuduvad" value={uusSeanss.subtiitrid} onChange={(e) => setUusSeanss({...uusSeanss, subtiitrid: e.target.value})} className="w-full bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <input type="text" placeholder="Algusaeg (nt 18:00)" value={uusSeanss.algusAeg} onChange={(e) => setUusSeanss({...uusSeanss, algusAeg: e.target.value})} className="bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                    <input type="text" placeholder="Lõppaeg (nt 20:00)" value={uusSeanss.loppAeg} onChange={(e) => setUusSeanss({...uusSeanss, loppAeg: e.target.value})} className="bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                  </div>
                 
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="url" placeholder="Filmi kaanepildi URL" value={uusSeanss.piltUrl} onChange={(e) => setUusSeanss({...uusSeanss, piltUrl: e.target.value})} className="bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                    <input type="url" placeholder="Treileri URL (nt YouTube)" value={uusSeanss.treilerUrl} onChange={(e) => setUusSeanss({...uusSeanss, treilerUrl: e.target.value})} className="bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                  </div>

                  <textarea rows="2" placeholder="Kirjeldus..." value={uusSeanss.kirjeldus} onChange={(e) => setUusSeanss({...uusSeanss, kirjeldus: e.target.value})} className="w-full bg-zinc-800 border border-gray-700 rounded p-2.5 text-white" />
                  <button type="submit" className="w-full bg-[#ffcc00] text-black font-extrabold py-3 rounded hover:bg-yellow-400 transition">+ Lisa seanss kavasse</button>
                </form>
              </div>

              {/* SEANSSIDE KUSTUTAMINE */}
              <div className="bg-[#262626] p-6 rounded-2xl border border-gray-700 shadow-xl">
                <h3 className="text-lg font-bold text-[#ffcc00] mb-4">🗑️ Olemasolevad seansid</h3>
                <div className="space-y-2">
                  {seansid.map((s) => (
                    <div key={s.id} className="flex justify-between items-center bg-zinc-800 p-3 rounded border border-gray-700 text-xs">
                      <div>
                        <span className="bg-zinc-700 text-[#ffcc00] px-1.5 py-0.5 rounded font-mono mr-2">{s.kuupaev}</span>
                        <strong className="text-[#ffcc00]">{s.algusAeg}</strong> - {s.pealkiri}
                      </div>
                      <button onClick={() => kustutaSeanss(s.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded">Kustuta</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* 3. VAADE: KAVA */}
      {aktiivneVaade === 'kava' && (
        <>
          <section className="p-8 max-w-7xl mx-auto">
            {bannerid[aktiivneBanner] && (
              <div
                className={`w-full h-52 ${bannerid[aktiivneBanner].varv} rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all duration-700 bg-cover bg-center`}
                style={bannerid[aktiivneBanner].piltUrl ? { backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.3)), url(${bannerid[aktiivneBanner].piltUrl})` } : {}}
              >
                <div>
                  <span className="bg-[#ffcc00] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{bannerid[aktiivneBanner].tyyp}</span>
                  <h2 className="text-2xl font-extrabold mt-3 max-w-2xl leading-tight">{bannerid[aktiivneBanner].pealkiri}</h2>
                </div>
                <div className="absolute bottom-4 right-4 flex space-x-2 items-center">
                  {bannerid.map((_, index) => (
                    <button key={index} onClick={() => setAktiivneBanner(index)} className={`h-2.5 rounded-full transition-all duration-300 ${aktiivneBanner === index ? 'w-6 bg-[#ffcc00]' : 'w-2.5 bg-gray-500'}`} />
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 text-gray-200 border-l-4 border-[#ffcc00] pl-3">Kinokava</h3>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {kavasOlevadKuupaevad.map((kp) => (
                <button
                  key={kp}
                  onClick={() => setValitudKuupaevFiltri(kp)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                    valitudKuupaevFiltri === kp
                      ? 'bg-[#ffcc00] text-black border-[#ffcc00]'
                      : 'bg-[#262626] text-gray-300 border-gray-700 hover:bg-zinc-800'
                  }`}
                >
                  📅 {kp === tananeKuupaev ? `Täna (${kp})` : kp}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {seansid.filter(s => s.kuupaev === valitudKuupaevFiltri).length === 0 ? (
                <p className="text-gray-500 text-sm italic">Sellel kuupäeval seansse ei leitud.</p>
              ) : (
                seansid
                  .filter(s => s.kuupaev === valitudKuupaevFiltri)
                  .map((seanss) => (
                    <div
                      key={seanss.id} onClick={() => setValitudSeanss(seanss)}
                      className="bg-[#262626] border border-gray-800 hover:border-[#ffcc00] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer transition shadow-lg group overflow-hidden"
                    >
                      {seanss.piltUrl && (
                        <img src={seanss.piltUrl} alt={seanss.pealkiri} className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
                      )}

                      <div className="bg-black px-3 py-2 rounded-lg text-center border border-gray-800 group-hover:border-[#ffcc00]">
                        <div className="text-lg font-black text-[#ffcc00]">{seanss.algusAeg}</div>
                        <div className="text-[10px] text-gray-400">kuni {seanss.loppAeg}</div>
                      </div>
                     
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded font-bold uppercase">{seanss.vanusepiirang || 'Pere'}</span>
                          <span className="text-[10px] bg-zinc-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">{seanss.kuupaev}</span>
                        </div>
                        <h4 className="text-lg font-bold text-white group-hover:text-[#ffcc00] transition">{seanss.pealkiri}</h4>
                        <div className="text-xs text-gray-400">{seanss.zanr} • {seanss.saal}</div>
                      </div>

                      <button className="bg-zinc-800 text-[#ffcc00] font-bold px-4 py-2 rounded-lg group-hover:bg-[#ffcc00] group-hover:text-black transition text-xs">
                        Vaata infot & vali kohad
                      </button>
                    </div>
                  ))
              )}
            </div>
          </section>
        </>
      )}

      {/* POP-UP 1: FILMI INFO MODAL */}
      {valitudSeanss && !naitaSaaliPlaani && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#262626] border border-gray-700 rounded-2xl max-w-lg w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setValitudSeanss(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold z-10">✕</button>
           
            {valitudSeanss.piltUrl && (
              <img src={valitudSeanss.piltUrl} alt={valitudSeanss.pealkiri} className="w-full h-48 object-cover rounded-xl mb-4 border border-gray-700" />
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded font-bold uppercase">{valitudSeanss.vanusepiirang || 'Pere'}</span>
              <span className="text-xs bg-zinc-800 text-[#ffcc00] border border-gray-700 px-2 py-0.5 rounded font-mono">📅 {valitudSeanss.kuupaev}</span>
            </div>

            <h3 className="text-2xl font-black text-[#ffcc00]">{valitudSeanss.pealkiri}</h3>
            <p className="text-xs text-gray-400 mb-4">{valitudSeanss.zanr} • {valitudSeanss.saal}</p>

            <div className="bg-black/50 p-3 rounded-xl border border-gray-800 mb-4 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500 block">Kellaaeg:</span><strong className="text-[#ffcc00]">{valitudSeanss.algusAeg} - {valitudSeanss.loppAeg}</strong></div>
              <div><span className="text-gray-500 block">Keel:</span><strong className="text-white">{valitudSeanss.keel || 'Eesti keeles'}</strong></div>
              <div><span className="text-gray-500 block">Subtiitrid:</span><strong className="text-white">{valitudSeanss.subtiitrid || 'Puuduvad'}</strong></div>
            </div>

            <p className="text-sm text-gray-300 mb-4 leading-relaxed">{valitudSeanss.kirjeldus || "Kirjeldus puudub."}</p>
           
            {valitudSeanss.treilerUrl && (
              <a href={valitudSeanss.treilerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 mb-6 bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-lg">
                ▶ Vaata treilerit YouTube-is
              </a>
            )}

            <button onClick={() => setNaitaSaaliPlaani(true)} className="w-full bg-[#ffcc00] text-black font-extrabold py-3 rounded-xl hover:bg-yellow-400 transition">
              Vali kohad saalis ({valitudSeanss.algusAeg})
            </button>
          </div>
        </div>
      )}

      {/* POP-UP 2: SAALI PLAAN JA ISTEKOHAD */}
      {valitudSeanss && naitaSaaliPlaani && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#262626] border border-gray-700 rounded-2xl max-w-2xl w-full p-6 relative shadow-2xl">
            <button onClick={() => setNaitaSaaliPlaani(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold">✕</button>
           
            <h3 className="text-xl font-black text-[#ffcc00] text-center mb-1">{valitudSeanss.pealkiri}</h3>
            <p className="text-xs text-gray-400 text-center mb-6">{valitudSeanss.kuupaev} • {valitudSeanss.saal} • Kell {valitudSeanss.algusAeg}</p>

            <div className="w-full mb-8 text-center">
              <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-[#ffcc00] to-transparent mx-auto rounded-full shadow-[0_0_15px_#ffcc00]"></div>
              <span className="text-[10px] uppercase tracking-widest text-gray-500 block mt-2">EKRAAN</span>
            </div>

            <div className="space-y-2 mb-6">
              {Array.from({ length: valitudSeanss.ridu || 1 }, (_, index) => index + 1).map((rida) => (
                <div key={rida} className="flex items-center justify-center space-x-2">
                  {Array.from({ length: valitudSeanss.kohtiRias || 2 }, (_, index) => index + 1).map((koht) => {
                    const kood = `${rida}-${koht}`;
                    const onHoivatud = hoivatudKohad.includes(kood);
                    const onValitud = valitudKohad.includes(kood);
                    return (
                      <button
                        key={koht} disabled={onHoivatud} onClick={() => validaKoht(rida, koht)}
                        className={`w-10 h-10 text-xs font-bold rounded-lg transition ${
                          onHoivatud ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700' :
                          onValitud ? 'bg-[#ffcc00] text-black shadow-lg' : 'bg-zinc-700 text-white hover:bg-zinc-500 border border-gray-600'
                        }`}
                      >
                        {koht}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <button
              disabled={valitudKohad.length === 0} onClick={kinnitaBroneering}
              className={`w-full font-extrabold py-3.5 rounded-xl transition ${valitudKohad.length > 0 ? 'bg-[#ffcc00] text-black hover:bg-yellow-400' : 'bg-zinc-800 text-gray-500 cursor-not-allowed'}`}
            >
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
