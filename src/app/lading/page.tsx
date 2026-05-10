'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlayCircle, MapPin, Users, FileText, Share2,
  AlignEndHorizontal, BarChart, CheckCircle, Shield, Target,
  Clock, Settings, Zap, Lightbulb, HelpCircle, MessageSquarePlus,
  Send, ChevronDown, Leaf, ArrowRight, Menu, X, TrendingUp, Mail, Phone
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

const G = '#4cae4f';
const GD = '#3a9e3d';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

function useCounter(end: number, active: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(end);
      return;
    }
    let cur = 0;
    const step = end / 60;
    const id = setInterval(() => {
      cur += step;
      if (cur >= end) { setVal(end); clearInterval(id); }
      else setVal(Math.floor(cur));
    }, 16);
    return () => clearInterval(id);
  }, [end, active]);
  return val;
}

export default function LandingPage() {
  const [videoOpen, setVideoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const [heroRef, heroIn] = useInView(0.05);
  const [statsRef, statsIn] = useInView(0.4);
  const [featRef, featIn] = useInView(0.05);
  const [diffRef, diffIn] = useInView(0.05);
  const [futureRef, futureIn] = useInView(0.05);
  const [contactRef, contactIn] = useInView(0.2);

  const plots = useCounter(1250, statsIn);
  const area = useCounter(875, statsIn);
  const farmers = useCounter(78, statsIn);

  const css = `
    html { scroll-behavior: smooth; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(28px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeLeft {
      from { opacity: 0; transform: translateX(-28px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes fadeRight {
      from { opacity: 0; transform: translateX(28px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes floatY {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-10px); }
    }
    @keyframes pulse-ring {
      0%   { transform: scale(1);   opacity: 0.6; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .lp-fade-up    { animation: fadeUp    0.65s ease both; }
    .lp-fade-left  { animation: fadeLeft  0.65s ease both; }
    .lp-fade-right { animation: fadeRight 0.65s ease both; }
    .lp-float      { animation: floatY 3.5s ease-in-out infinite; }
    .lp-hidden     { opacity: 0; }
    .lp-card {
      transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
    }
    .lp-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 48px -12px rgba(76,174,79,0.22);
      border-color: #4cae4f !important;
    }
    .lp-card:hover .lp-icon {
      transform: scale(1.18) rotate(4deg);
    }
    .lp-icon {
      transition: transform 0.3s ease;
    }
    .lp-btn-primary {
      background: ${G};
      color: #fff;
      transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    }
    .lp-btn-primary:hover  { background: ${GD}; transform: scale(1.03); }
    .lp-btn-primary:active { transform: scale(0.97); }
    .lp-btn-outline {
      border: 2px solid ${G};
      color: ${G};
      background: #fff;
      transition: background 0.2s, transform 0.15s;
    }
    .lp-btn-outline:hover  { background: rgba(76,174,79,0.07); transform: scale(1.03); }
    .lp-btn-outline:active { transform: scale(0.97); }
    .lp-gradient-text {
      background: linear-gradient(135deg, #4cae4f 0%, #2e7d32 55%, #66bb6a 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .lp-nav-link {
      position: relative;
      color: #4b5563;
      transition: color 0.2s;
    }
    .lp-nav-link::after {
      content: '';
      position: absolute;
      bottom: -2px; left: 0;
      width: 0; height: 2px;
      background: ${G};
      transition: width 0.25s ease;
      border-radius: 2px;
    }
    .lp-nav-link:hover { color: #111827; }
    .lp-nav-link:hover::after { width: 100%; }
    .lp-img-zoom {
      transition: transform 0.5s ease;
    }
    .lp-card:hover .lp-img-zoom { transform: scale(1.06); }
    .lp-progress-bar {
      height: 3px;
      border-radius: 9999px;
      background: ${G};
      transition: width 1.1s cubic-bezier(0.4,0,0.2,1);
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;

  const navLinks = [
    { href: '#functionalitati', label: 'Funcționalități' },
    { href: '#diferentiatori', label: 'Avantaje' },
    { href: '#viitor',         label: 'Roadmap' },
    { href: '#contact',        label: 'Contact' },
  ];

  const features = [
    {
      title: 'Hartă interactivă detaliată',
      description: 'Navigați, identificați și gestionați parcelele cu precizie cadastrală. Suprapuneți straturi de informații și accesați detalii complete.',
      icon: <MapPin className="w-7 h-7" />,
      image: '/img/Screenshot 2025-05-15 184744.png',
      span: 'sm:col-span-1 lg:col-span-2',
    },
    {
      title: 'Măsurători precise',
      description: 'Permite măsurători precise ale parcelelor conform titlurilor de proprietate.',
      icon: <FileText className="w-7 h-7" />,
      image: '/img/masurare1.png',
      span: '',
    },
    {
      title: 'Vizualizare detaliată',
      description: 'Fiecare fermier poate vizualiza parcelele sale, deținute, arendate și parcelele vecinilor.',
      icon: <Users className="w-7 h-7" />,
      image: '/img/parceleagricultor.png',
      span: '',
    },
    {
      title: 'Statistici globale',
      description: 'Primăria și agricultorii pot vizualiza statistici pentru tot satul și individuale.',
      icon: <AlignEndHorizontal className="w-7 h-7" />,
      image: '/img/Statistici1.png',
      span: 'sm:col-span-1 lg:col-span-2',
    },
  ];

  const differentiators = [
    { icon: <Shield size={24} />, title: 'Date oficiale și precise', description: 'Utilizăm date direct din Fondul Funciar (Cadastru.md), asigurând acuratețe și actualizări constante.' },
    { icon: <Target size={24} />, title: 'Interfață intuitivă', description: 'Platformă ușor de utilizat, chiar și pentru persoanele mai puțin tehnice. Design modern și accesibil.' },
    { icon: <CheckCircle size={24} />, title: 'Accesibilitate garantată', description: 'Date accesibile pentru utilizatorii autorizați – primării și agricultori. Informație relevantă la îndemână.' },
    { icon: <Clock size={24} />, title: 'Eficiență maximă', description: 'Digitalizăm procesele, eliminăm erorile și reducem timpul pentru gestionarea informațiilor funciare.' },
    { icon: <Settings size={24} />, title: 'Adaptabilitate locală', description: 'Construit cu specificitățile și nevoile administrației locale și ale fermierilor din Moldova.' },
    { icon: <Zap size={24} />, title: 'Inovație continuă', description: 'Ne angajăm să aducem constant îmbunătățiri și noi funcționalități pentru agricultura modernă.' },
  ];

  const roadmap = [
    { icon: <FileText size={20} />, title: 'Export avansat de date', description: 'Exportați date în formate flexibile (Excel, Word), alegând câmpurile și structura necesară.', pct: 30 },
    { icon: <CheckCircle size={20} />, title: 'Automatizarea contractelor', description: 'Generare automată a contractelor de arendă pe baza șabloanelor și datelor din platformă.', pct: 45 },
    { icon: <MapPin size={20} />, title: 'Măsurători personalizate', description: 'Instrumente pentru măsurarea precisă a ariilor și lungimilor, fără cod cadastral inițial.', pct: 20 },
    { icon: <Share2 size={20} />, title: 'Integrare extinsă', description: 'Conectarea cu sisteme guvernamentale relevante pentru un flux de date unitar.', pct: 15 },
    { icon: <BarChart size={20} />, title: 'Analize avansate', description: 'Funcționalități avansate de analiză pentru sprijinirea deciziilor strategice.', pct: 25 },
    { icon: <HelpCircle size={20} />, title: 'Aplicație mobilă', description: 'Acces la platformă și funcționalități cheie direct de pe dispozitive mobile.', pct: 10 },
  ];

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen font-sans overflow-x-hidden">
      <style>{css}</style>

      {/* ── NAVBAR ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid #f0f0f0' : 'none',
          boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/lading" className="flex items-center space-x-2 cursor-pointer group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center lp-icon" style={{ backgroundColor: G }}>
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">AgriCad</span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white hidden sm:inline-block"
                style={{ backgroundColor: G }}
              >
                Moldova
              </span>
            </a>

            {/* Desktop links */}
            <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="lp-nav-link cursor-pointer">{l.label}</a>
              ))}
            </div>

            {/* Desktop CTA */}
            <a
              href="/"
              className="hidden md:inline-flex items-center lp-btn-primary font-semibold py-2 px-5 rounded-xl text-sm cursor-pointer"
              style={{ boxShadow: '0 4px 14px rgba(76,174,79,0.3)' }}
            >
              <Users className="mr-1.5 h-4 w-4" /> Conectează-te
            </a>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
              aria-label="Meniu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100" style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={closeMenu}
                  className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium text-sm cursor-pointer transition-colors duration-150"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="/"
                className="lp-btn-primary mt-2 flex items-center justify-center font-semibold py-2.5 px-5 rounded-xl text-sm cursor-pointer"
              >
                <Users className="mr-2 h-4 w-4" /> Conectează-te
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <div
            className="absolute top-0 left-0 w-3/4 h-3/4 rounded-full opacity-60"
            style={{ background: 'radial-gradient(ellipse at top left, rgba(76,174,79,0.10) 0%, transparent 65%)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-2/3 h-2/3 rounded-full opacity-40"
            style={{ background: 'radial-gradient(ellipse at bottom right, rgba(76,174,79,0.07) 0%, transparent 65%)' }}
          />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full relative z-10">
          <div ref={heroRef} className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Left — text */}
            <div className={`text-center lg:text-left ${heroIn ? 'lp-fade-left' : 'lp-hidden'}`}>
              {/* Badge */}
              <div
                className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border cursor-default"
                style={{ background: 'rgba(76,174,79,0.08)', borderColor: 'rgba(76,174,79,0.25)', color: GD }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: G }}
                />
                <span>Versiune Alpha · Gratuit</span>
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none mb-6">
                <span className="lp-gradient-text">AgriCad</span>
                <br />
                <span className="text-gray-900">Moldova</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Revoluționăm administrația agricolă. Conectăm primăriile și fermierii prin{' '}
                <strong className="text-gray-700 font-semibold">date precise</strong> și accesibile.
              </p>

              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <a
                  href="/"
                  className="lp-btn-primary inline-flex items-center justify-center font-semibold py-3.5 px-8 rounded-xl text-base cursor-pointer"
                  style={{ boxShadow: '0 8px 28px -4px rgba(76,174,79,0.38)' }}
                >
                  <Users className="mr-2 h-5 w-5" />
                  Conectează-te
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>

                <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
                  <DialogTrigger asChild>
                    <button className="lp-btn-outline inline-flex items-center justify-center font-semibold py-3.5 px-8 rounded-xl text-base cursor-pointer">
                      <PlayCircle className="mr-2 h-5 w-5" />
                      Videoclip demo
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[55vw] p-0 overflow-hidden">
                    <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
                      <iframe
                        src="https://player.vimeo.com/video/1086287591?h=363350e1f6&badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1"
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        title="Prezentare AgriCad"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Trust bullets */}
              <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-gray-500">
                {['Date cadastrale oficiale', 'Acces securizat pe rol', 'Hartă interactivă live'].map((t) => (
                  <div key={t} className="flex items-center space-x-1.5">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: G }} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — screenshot */}
            <div className={`relative ${heroIn ? 'lp-fade-right' : 'lp-hidden'}`} style={{ animationDelay: '150ms' }}>
              <div className="lp-float" style={{ animationDelay: '0.4s' }}>
                {/* Browser chrome */}
                <div
                  className="bg-white rounded-2xl overflow-hidden border border-gray-200"
                  style={{ boxShadow: '0 32px 80px -16px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-center space-x-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <div className="ml-3 flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 text-left">
                      agricad.md · Hartă interactivă
                    </div>
                  </div>
                  <img
                    src="/img/Screenshot 2025-05-15 184824.png"
                    alt="Hartă interactivă AgriCad Moldova"
                    className="w-full object-cover object-top"
                    style={{ maxHeight: '300px' }}
                  />
                </div>

                {/* Floating card — parcele */}
                <div
                  className="absolute -bottom-5 -left-6 bg-white rounded-2xl border border-gray-100 p-3.5 min-w-[148px]"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                >
                  <div className="text-xs text-gray-400 mb-1">Parcele înregistrate</div>
                  <div className="text-2xl font-extrabold text-gray-900">1 250+</div>
                  <div className="flex items-center mt-1.5 text-xs font-semibold" style={{ color: G }}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12% luna aceasta
                  </div>
                </div>

                {/* Floating card — fermieri */}
                <div
                  className="absolute -top-5 -right-6 bg-white rounded-2xl border border-gray-100 p-3.5 min-w-[130px]"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
                >
                  <div className="text-xs text-gray-400 mb-1">Fermieri activi</div>
                  <div className="text-2xl font-extrabold text-gray-900">78</div>
                  <div className="flex items-center mt-1.5 space-x-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full border-2 border-white flex-shrink-0"
                        style={{
                          backgroundColor: `hsl(${130 + i * 18}, 48%, 58%)`,
                          marginLeft: i > 0 ? '-6px' : '0',
                        }}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1.5">+73</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-400 text-xs space-y-1 animate-bounce select-none pointer-events-none">
            <span>Descoperă mai mult</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div ref={statsRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
            {[
              { val: plots,   suffix: '+',  label: 'Parcele înregistrate', icon: <MapPin  className="w-6 h-6" /> },
              { val: area,    suffix: ' ha', label: 'Suprafață gestionată',  icon: <FileText className="w-6 h-6" /> },
              { val: farmers, suffix: '+',  label: 'Fermieri înregistrați', icon: <Users  className="w-6 h-6" /> },
            ].map((s, i) => (
              <div
                key={i}
                className={`${statsIn ? 'lp-fade-up' : 'lp-hidden'}`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div
                  className="lp-icon inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                  style={{ background: 'rgba(76,174,79,0.1)', color: G }}
                >
                  {s.icon}
                </div>
                <div className="text-5xl font-extrabold text-gray-900 mb-1 tabular-nums">
                  {s.val.toLocaleString('ro-RO')}{s.suffix}
                </div>
                <div className="text-gray-500 text-sm font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50" id="functionalitati">
        <div className="max-w-7xl mx-auto">
          <div
            ref={featRef}
            className={`text-center mb-16 ${featIn ? 'lp-fade-up' : 'lp-hidden'}`}
          >
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: G }}>Platforma</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3 mb-4">
              Funcționalități <span className="lp-gradient-text">principale</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Descoperiți cum AgriCad transformă gestionarea terenurilor agricole, oferind transparență și eficiență.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className={`group bg-white rounded-2xl overflow-hidden border border-gray-200 lp-card cursor-default ${f.span} ${featIn ? 'lp-fade-up' : 'lp-hidden'}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative overflow-hidden bg-gray-50" style={{ height: '200px' }}>
                  <img
                    src={f.image}
                    alt={f.title}
                    className="w-full h-full object-cover lp-img-zoom"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-5">
                  <div className="flex items-center mb-2 space-x-3">
                    <div
                      className="lp-icon flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(76,174,79,0.1)', color: G }}
                    >
                      {f.icon}
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFFERENTIATORS ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white" id="diferentiatori">
        <div className="max-w-6xl mx-auto">
          <div
            ref={diffRef}
            className={`text-center mb-16 ${diffIn ? 'lp-fade-up' : 'lp-hidden'}`}
          >
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: G }}>Avantaje</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3 mb-4">
              Ce ne <span className="lp-gradient-text">diferențiază?</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              AgriCad nu este doar o altă platformă. Este soluția gândită specific pentru contextul agricol din Moldova.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentiators.map((d, i) => (
              <div
                key={i}
                className={`group bg-gray-50 rounded-2xl border border-gray-200 p-6 lp-card cursor-default ${diffIn ? 'lp-fade-up' : 'lp-hidden'}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="lp-icon w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(76,174,79,0.1)', color: G }}
                >
                  {d.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{d.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50" id="viitor">
        <div className="max-w-4xl mx-auto">
          <div
            ref={futureRef}
            className={`text-center mb-16 ${futureIn ? 'lp-fade-up' : 'lp-hidden'}`}
          >
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: G }}>Roadmap</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3 mb-4">
              Privim spre <span className="lp-gradient-text">viitor</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Angajamentul nostru este dezvoltarea continuă. Iată funcționalitățile majore în pregătire:
            </p>
          </div>

          <div className="space-y-4">
            {roadmap.map((r, i) => (
              <div
                key={i}
                className={`group bg-white rounded-2xl border border-gray-200 p-5 lp-card cursor-default flex items-start space-x-4 ${futureIn ? 'lp-fade-left' : 'lp-hidden'}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className="lp-icon flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5"
                  style={{ background: 'rgba(76,174,79,0.1)', color: G }}
                >
                  {r.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-gray-900">{r.title}</h3>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 ml-3 flex-shrink-0">
                      În pregătire
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-3">{r.description}</p>
                  {/* Progress bar */}
                  <div className="bg-gray-100 rounded-full overflow-hidden" style={{ height: '3px' }}>
                    <div
                      className="lp-progress-bar"
                      style={{
                        width: futureIn ? `${r.pct}%` : '0%',
                        transitionDelay: `${(i + 1) * 120}ms`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Idea box */}
          <div
            className={`mt-14 bg-white rounded-2xl p-8 md:p-10 text-center ${futureIn ? 'lp-fade-up' : 'lp-hidden'}`}
            style={{
              animationDelay: '700ms',
              border: `2px solid rgba(76,174,79,0.2)`,
              boxShadow: '0 8px 32px rgba(76,174,79,0.08)',
            }}
          >
            <div
              className="lp-icon w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(76,174,79,0.1)', color: G }}
            >
              <MessageSquarePlus className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Aveți o idee?</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
              Feedback-ul dumneavoastră este valoros! Trimiteți-ne sugestii pentru noi funcționalități sau îmbunătățiri.
            </p>
            <a
              href="mailto:agricad.md@gmail.com"
              className="lp-btn-primary inline-flex items-center justify-center font-semibold py-3 px-8 rounded-xl text-sm cursor-pointer"
              style={{ boxShadow: '0 8px 24px -4px rgba(76,174,79,0.32)' }}
            >
              <Send className="mr-2 h-4 w-4" /> Scrie un email
            </a>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white" id="contact">
        <div ref={contactRef} className="max-w-3xl mx-auto text-center">
          <div className={`${contactIn ? 'lp-fade-up' : 'lp-hidden'}`}>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: G }}>Contact</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3 mb-4">
              Contactați-<span className="lp-gradient-text">ne</span>
            </h2>
            <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto">
              Sunteți gata să transformați modul în care gestionați agricultura? Aveți întrebări sau doriți un demo?
            </p>

            <div className="grid sm:grid-cols-2 gap-5">
              <a
                href="mailto:agricad.md@gmail.com"
                className="group bg-gray-50 rounded-2xl border border-gray-200 p-6 lp-card cursor-pointer flex items-center space-x-4 text-left"
              >
                <div
                  className="lp-icon flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(76,174,79,0.1)', color: G }}
                >
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5 font-medium">Email</div>
                  <div className="font-semibold text-gray-900 text-sm group-hover:text-green-600 transition-colors duration-200">
                    agricad.md@gmail.com
                  </div>
                </div>
              </a>

              <a
                href="tel:+37368512814"
                className="group bg-gray-50 rounded-2xl border border-gray-200 p-6 lp-card cursor-pointer flex items-center space-x-4 text-left"
              >
                <div
                  className="lp-icon flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(76,174,79,0.1)', color: G }}
                >
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5 font-medium">Telefon</div>
                  <div className="font-semibold text-gray-900 text-sm group-hover:text-green-600 transition-colors duration-200">
                    +373-685-12-814
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── ALPHA NOTICE ── */}
      <section className="py-10 px-4 text-center" style={{ background: '#fffbeb', borderTop: '1px solid #fde68a', borderBottom: '1px solid #fde68a' }}>
        <div className="max-w-3xl mx-auto">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
          <h3 className="text-base font-bold text-yellow-800 mb-2">Notă importantă: Versiune Alpha</h3>
          <p className="text-yellow-700 text-sm leading-relaxed">
            Platforma <strong>AgriCad</strong> este în stadiul <strong>Alpha</strong>. O oferim gratuit pentru testare, iar feedback-ul dumneavoastră este esențial.
            Contribuția dumneavoastră ne va ajuta să modelăm viitorul acestei soluții. Vă mulțumim!
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-4 text-center" style={{ background: '#111827' }}>
        <div className="flex items-center justify-center space-x-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: G }}>
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">AgriCad Moldova</span>
        </div>
        <p className="text-gray-500 text-xs mb-1">
          &copy; {new Date().getFullYear()} AgriCad Moldova. Toate drepturile rezervate.
        </p>
        <p className="text-gray-600 text-xs">Dezvoltat cu pasiune pentru agricultura viitorului.</p>
      </footer>
    </div>
  );
}
