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
    saal: 'Saal 1', saaliSuurus: '1x2', keel: 'Eesti keeles', subtiitrid: 'Eesti', kirjeldus: '', piltUrl: '', treilerUrl: '', piletiHind: 8.50
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
      setSeansid(data);
    } else {
      // Vaikimisi varuseanss kui andmebaas on tühi
      setSeansid([
        {
          id: 's-1',
          pealkiri: 'Lego Film 3',
          zanr: 'Animatsioon, Pere',
          vanusepiirang: 'Pere',
          kuupaev: tananeKuupaev,
          algusAeg: '12:00',
          loppAeg: '13:40',
          saal: 'Saal 1 (Väike)',
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
      setBannerid(data);
    } else {
      // Vaikimisi bännerid
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
    
    const uusObjekt = {
      id: `s-${Date.now()}`,
      pealkiri: uusSeanss.pealkiri,
      zanr: uusSeanss.zanr,
      vanusepiirang: uusSeanss.vanusepiirang,
      kuupaev: uusSeanss.kuupaev,
      algusAeg: uusSeanss.algusAeg,
      loppAeg: uusSeanss.loppAeg,
      saal: uusSeanss.saal,
      ridu: ridu || 1,
      kohtiRias: kohtiRias || 2,
      keel: uusSeanss.keel,
      subtiitrid: uusSeanss.subtiitrid,
      kirjeldus: uusSeanss.kirjeldus,
      piltUrl: uusSeanss.piltUrl,
      treilerUrl: uusSeanss.treilerUrl,
      piletiHind: parseFloat(uusSeanss.piletiHind) || 8.00
    };

    // Saadame Supabase'i
    const { error } = await supabase.from('seansid').insert([uusObjekt]);

    if (error) {
      console.log('Teade Supabase seanssidest:', error.message);
    }

    // Lisame ka ekraanile
    const uued = [...seansid, uusObjekt].sort((a, b) => (a.kuupaev + a.algusAeg).localeCompare(b.kuupaev + b.algusAeg));
    setSeansid(uued);

    setUusSeanss({ pealkiri: '', zanr: '', vanusepiirang: 'Pere', kuupaev: tananeKuupaev, algusAeg: '18:00', loppAeg: '20:00', saal: 'Saal 1', saaliSuurus: '1x2', keel: 'Eesti keeles', subtiitrid: 'Eesti', kirjeldus: '', piltUrl: '', treilerUrl: '', piletiHind: 8.50 });
    alert('Uus seanss lisatud ja salvestatud!');
  };

  // 3. SALVESTA BÄNNER SUPABASE'I
  const lisaBanner = async (e) => {
    e.preventDefault();
    if (!uusBanner.pealkiri) return;
    
    const uusObj = { pealkiri: uusBanner.pealkiri, tyyp: uusBanner.tyyp, piltUrl: uusBanner.piltUrl, varv: uusBanner.varv };
    
    await supabase.from('bannerid').insert([uusObj]);

    setBannerid([...bannerid, { id: Date.now(), ...uusObj }]);
    setUusBanner({ pealkiri: '', tyyp: 'Kampaania', piltUrl: '', varv: 'bg-gradient-to-r from-purple-900 to-indigo-900' });
    alert('Uus bänner lisatud!');
  };

  // 4. KUSTUTA BÄNNER SUPABASE'IST
  const kustutaBanner = async (id) => {
    if (bannerid.length <= 1) return alert('Vähemalt 1 bänner peab alles jääma!');
    await supabase.from('bannerid').delete().eq('id', id);
    setBannerid(bannerid.filter(b => b.id !== id));
    setAktiivneBanner(0);
  };

  // 5. KUSTUTA SEANSS SUPABASE'IST
  const kustutaSeanss = async (id) => {
    if (confirm('Kas oled kindel, et soovid selle seansi kustutada?')) {
      await supabase.from('seansid').delete().eq('id', id);
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
      const kogusumma = (valitudKohad.length * (valitudSeanss.piletiHind || 8)).toFixed(2);
     
      const uusPilet = {
        piletiKood: `KINO-${Math.floor(100000 + Math.random() * 900000)}`,
        seanss: valitudSeanss.pealkiri,
        saal: valitudSeanss.saal,
        aeg: `${valitudSeanss.kuupaev} (${valitudSeanss.algusAeg} - ${valitudSeanss.loppAeg})`,
        kohad: [...valitudKohad],
        hind: kogusumma,
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
