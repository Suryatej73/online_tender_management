import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  ArrowRight, Check, ChevronDown, FileCheck2, FileText, Gavel, LockKeyhole,
  Menu, ScanLine, Search, ShieldCheck, Sparkles, X, Zap, BrainCircuit,
  Building2, Clock3, BarChart3, Upload, CheckCircle2, Award, Users
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const fadeUp = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.09 } } };
const tenderCards = [
  ['TX-2048', 'Infrastructure Development Project', 'Government Infrastructure', '₹2.4 Cr', '18 Days', 96],
  ['TX-2051', 'Smart City Network Upgrade', 'Technology', '₹8.7 Cr', '24 Days', 91],
  ['TX-2044', 'Riverfront Mobility Corridor', 'Civil Infrastructure', '₹1.8 Cr', '31 Days', 89],
];

function SectionTitle({ eyebrow, title, copy, center = false }) {
  return <motion.div className={`tx-section-title ${center ? 'tx-center' : ''}`} variants={fadeUp}>
    <span className="tx-eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    {copy && <p>{copy}</p>}
  </motion.div>;
}

function Button({ children, onClick, secondary = false, href }) {
  const props = href ? { href } : { onClick, type: 'button' };
  const Tag = href ? 'a' : 'button';
  return <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}><Tag {...props} className={`tx-button ${secondary ? 'tx-button-secondary' : ''}`}>{children}<ArrowRight size={16} /></Tag></motion.div>;
}

function Metric({ label, value, sub, accent }) {
  return <motion.div className="tx-metric" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
    <span>{label}</span><strong className={accent ? 'tx-orange' : ''}>{value}</strong><small>{sub}</small>
  </motion.div>;
}

function ProductWindow() {
  return <div className="tx-product-window" aria-label="TenderX command center preview">
    <div className="tx-window-top"><div className="tx-logo-small">tX</div><span>Command Center</span><div className="tx-window-actions"><i/><i/><i/></div></div>
    <div className="tx-command-grid">
      <Metric label="Active Tenders" value="₹24.8 Cr" sub="Across 12 opportunities" />
      <Metric label="AI Match" value="96%" sub="Top opportunity score" accent />
      <Metric label="Pending Actions" value="07" sub="Review before deadline" />
      <Metric label="Submission Deadline" value="18 Days" sub="TX-2048 · Infrastructure" />
    </div>
    <div className="tx-chart"><div className="tx-chart-head"><span>Opportunity performance</span><b>+18.4%</b></div><svg viewBox="0 0 600 140" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#ff7a1a" stopOpacity=".36"/><stop offset="1" stopColor="#ff7a1a" stopOpacity="0"/></linearGradient></defs><path d="M0 120 C70 105 80 98 125 104 S190 52 245 78 S310 92 358 48 S430 82 475 42 S540 66 600 12 L600 140 L0 140Z" fill="url(#chartFill)"/><path className="tx-chart-line" d="M0 120 C70 105 80 98 125 104 S190 52 245 78 S310 92 358 48 S430 82 475 42 S540 66 600 12"/></svg></div>
    <div className="tx-command-row"><div><span className="tx-dot"/> Tender intelligence is live</div><button type="button">Open workspace <ArrowRight size={13}/></button></div>
  </div>;
}

function FloatingCard({ className, label, value, copy, icon: Icon }) {
  return <motion.div className={`tx-float-card ${className || ''}`} animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
    <Icon size={15}/><span>{label}</span><strong>{value}</strong><small>{copy}</small>
  </motion.div>;
}

function Hero({ onOpenLogin, onOpenRegister }) {
  return <section className="tx-hero" id="platform">
    <div className="tx-noise"/><div className="tx-orb tx-orb-one"/><div className="tx-orb tx-orb-two"/>
    <motion.div className="tx-hero-copy" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="tx-hero-pill"><Sparkles size={14}/> The intelligent procurement operating system</motion.div>
      <motion.h1 variants={fadeUp}>Every Tender.<br/><em>One Intelligent Platform.</em></motion.h1>
      <motion.p variants={fadeUp}>TenderX brings tender discovery, AI analysis, bid preparation, compliance, secure submission and evaluation into one intelligent workflow.</motion.p>
      <motion.div variants={fadeUp} className="tx-hero-actions"><Button onClick={onOpenRegister}>Explore TenderX</Button><Button secondary href="#workflow">See how it works</Button></motion.div>
    </motion.div>
    <div className="tx-hero-stage">
      <FloatingCard className="tx-float-match" icon={BrainCircuit} label="AI match" value="96%" copy="Infrastructure development"/>
      <FloatingCard className="tx-float-deadline" icon={Clock3} label="Deadline" value="18 days" copy="Tender #TX-2048"/>
      <FloatingCard className="tx-float-compliance" icon={ShieldCheck} label="Compliance" value="98%" copy="Documents verified"/>
      <FloatingCard className="tx-float-status" icon={CheckCircle2} label="Bid status" value="Qualified" copy="Technical review complete"/>
      <ProductWindow/>
    </div>
    <div className="tx-scroll-note"><span/> Scroll to enter the workflow <ChevronDown size={15}/></div>
  </section>;
}

function Discovery() {
  return <section className="tx-section tx-discovery" id="solutions"><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }} variants={stagger} className="tx-shell">
    <SectionTitle eyebrow="01 · DISCOVER" title="Discover the right tenders. Automatically." copy="A relevance-first workspace that brings qualified opportunities to the surface before your competitors see them."/>
    <motion.div variants={fadeUp} className="tx-discovery-panel tx-reveal"><div className="tx-search"><Search size={18}/><span>Search tenders, sectors, locations...</span><kbd>⌘ K</kbd></div><div className="tx-filter-row">{['Category', 'Location', 'Value', 'Deadline', 'Eligibility', 'AI Match'].map((item, i) => <button className={i === 5 ? 'active' : ''} type="button" key={item}>{item}<ChevronDown size={13}/></button>)}</div><div className="tx-tender-list">{tenderCards.map(([id,title,type,value,deadline,match], i) => <motion.article className={`tx-tender-card ${i === 0 ? 'featured' : ''}`} key={id} whileHover={{ y: -4 }}><div className="tx-tender-id"><span>{id}</span><span className="tx-match">AI Match <b>{match}%</b></span></div><h3>{title}</h3><p>{type}</p><div className="tx-tender-meta"><strong>{value}</strong><span><Clock3 size={14}/>{deadline}</span></div><button type="button">View tender <ArrowRight size={14}/></button></motion.article>)}</div></motion.div>
  </motion.div></section>;
}

function Intelligence() { const checks = [['Eligibility requirements satisfied', true], ['Required documents available', true], ['Financial guarantee required', false], ['Technical capability matched', true]]; return <section className="tx-section tx-intelligence" id="ai"><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }} variants={stagger} className="tx-shell tx-two-col"><div><SectionTitle eyebrow="02 · ANALYZE" title="Understand every tender before you bid." copy="TenderX AI turns hundreds of pages into clear signals your team can act on."/><motion.div variants={fadeUp} className="tx-insight"><Sparkles size={18}/><div><span>TenderX AI insight</span><p>“This tender strongly matches your company capabilities. The main risk is the financial guarantee requirement.”</p></div></motion.div></div><motion.div variants={fadeUp} className="tx-analysis-panel tx-reveal"><div className="tx-panel-title"><span>AI TENDER ANALYSIS</span><span className="tx-live">Live analysis</span></div><div className="tx-score-grid">{[['Eligibility','94'],['Compliance','98'],['Bid potential','91'],['Risk','LOW']].map(([name,score])=><div key={name}><span>{name}</span><b>{score}{score !== 'LOW' && '%'}</b><i><em style={{width: score === 'LOW' ? '24%' : `${score}%`}}/></i></div>)}</div><div className="tx-checklist">{checks.map(([label, ok]) => <div key={label} className={ok ? '' : 'warn'}>{ok ? <Check size={15}/> : <Zap size={15}/>}<span>{label}</span></div>)}</div></motion.div></motion.div></section>; }

function Documents() { const fields = [['Tender value','₹2,40,00,000'],['EMD','₹4,80,000'],['Submission date','24 September 2026'],['Eligibility','Class A Contractor'],['Required documents','12']]; return <section className="tx-section tx-documents" id="features"><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }} variants={stagger} className="tx-shell"><SectionTitle eyebrow="03 · EXTRACT" title="Turn tender documents into actionable data." copy="Upload once. Let OCR, extraction and validation give your bid team a structured head start." center/><motion.div variants={fadeUp} className="tx-document-stage tx-reveal"><div className="tx-pipeline">{[['Upload',Upload],['OCR',ScanLine],['AI extraction',BrainCircuit],['Validation',ShieldCheck],['Structured data',FileCheck2]].map(([label,Icon],i)=><React.Fragment key={label}><div className={i === 4 ? 'done' : ''}><Icon size={17}/><span>{label}</span></div>{i<4&&<i/>}</React.Fragment>)}</div><div className="tx-doc-workspace"><div className="tx-document-paper"><div className="tx-paper-brand"><span>GOVERNMENT PROCUREMENT</span><FileText size={18}/></div><h3>Infrastructure Development Project</h3><p>Invitation for technical and financial proposals</p><div className="tx-paper-line w1"/><div className="tx-paper-line w2"/><div className="tx-paper-highlight">Estimated contract value <b>₹2,40,00,000</b></div><div className="tx-scan-line"/><div className="tx-paper-line w3"/></div><div className="tx-extracted">{fields.map(([label,value],i)=><motion.div key={label} initial={{opacity:0,x:16}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:i*.08}}><span>{label}</span><b>{value}</b></motion.div>)}<strong className="tx-verified"><Check size={14}/> AI verified</strong></div></div></motion.div></motion.div></section>; }

function Workflow() { const steps = [['Discover',Search,'Relevant tenders, ranked'],['Analyze',BrainCircuit,'Signals and risk, clarified'],['Prepare',FileText,'Bid content, assembled'],['Validate',ShieldCheck,'Compliance, checked'],['Submit',LockKeyhole,'Encrypted, auditable'],['Award',Award,'Decision, documented']]; return <section className="tx-section tx-workflow" id="workflow"><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }} variants={stagger} className="tx-shell"><SectionTitle eyebrow="ONE CONNECTED WORKFLOW" title="From opportunity to award, without losing the thread." center/><motion.div variants={fadeUp} className="tx-workflow-line">{steps.map(([title,Icon,copy],i)=><React.Fragment key={title}><motion.div className="tx-work-step" whileHover={{y:-5}}><div><Icon size={19}/></div><strong>0{i+1}</strong><h3>{title}</h3><p>{copy}</p></motion.div>{i<steps.length-1&&<span className="tx-work-connector"/>}</React.Fragment>)}</motion.div></motion.div></section>; }

function BidBuilder() { const inputs = [['Company profile',Building2],['Technical proposal',FileText],['Financial bid',BarChart3],['Compliance docs',ShieldCheck],['Past experience',Award]]; return <section className="tx-section tx-builder"><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }} variants={stagger} className="tx-shell tx-builder-wrap"><div><SectionTitle eyebrow="04 · PREPARE" title="Build stronger bids, faster." copy="Every input comes together in one intelligent bid workspace, with a clear picture of readiness."/><Button secondary href="#contact">Explore bid management</Button></div><motion.div variants={fadeUp} className="tx-builder-stage tx-reveal"><div className="tx-input-orbit">{inputs.map(([label,Icon],i)=><motion.div key={label} className={`tx-input-card input-${i}`} animate={{y:[0, i%2 ? 8 : -8,0]}} transition={{duration:4+i*.35,repeat:Infinity,ease:'easeInOut'}}><Icon size={16}/><span>{label}</span><Check size={13}/></motion.div>)}</div><div className="tx-builder-core"><div className="tx-panel-title"><span>AI BID BUILDER</span><Sparkles size={15}/></div><div className="tx-builder-tabs"><span className="selected">Technical proposal</span><span>Financial proposal</span><span>Compliance</span></div><div className="tx-builder-copy"><i/><i/><i/><i/></div><div className="tx-readiness"><div><span>Completion</span><b>92%</b></div><i><em/></i></div><button type="button">Validate bid <ArrowRight size={14}/></button></div></motion.div></motion.div></section>; }

function ValidateAndSubmit() { const bars = [['Documents',100],['Eligibility',94],['Compliance',100],['Financial',89]]; return <section className="tx-section tx-validation"><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }} variants={stagger} className="tx-shell tx-two-col"><motion.div variants={fadeUp} className="tx-validation-card tx-reveal"><div className="tx-panel-title"><span>BID VALIDATION</span><ShieldCheck size={17}/></div>{bars.map(([label,value])=><div className="tx-bar" key={label}><span>{label}</span><b>{value}%</b><i><em style={{width:`${value}%`}}/></i></div>)}<div className="tx-readiness-score"><span>Overall readiness</span><strong>96<small>%</small></strong><p>Ready to submit</p></div></motion.div><div><SectionTitle eyebrow="05 · VALIDATE" title="Submit with confidence." copy="Mandatory requirements, eligibility and documents are checked before your bid ever leaves the workspace."/><motion.div variants={fadeUp} className="tx-submit-flow">{['Draft','Validation','Digital signature','Encryption','Submitted'].map((item,i)=><React.Fragment key={item}><div className={i===4?'success':''}>{i===4?<Check size={15}/>:<span>{i+1}</span>}{item}</div>{i<4&&<i/>}</React.Fragment>)}</motion.div><motion.div variants={fadeUp} className="tx-success-card"><CheckCircle2 size={22}/><div><span>BID SUBMITTED</span><strong>Tender #TX-2048</strong><p>Submission ID · TX-2026-84921</p></div></motion.div></div></motion.div></section>; }

function Tracking() { const bidders = [['BuildCore Systems',89,94,91],['Alpha Technologies',92,87,90],['Nova Infra',84,91,87]]; return <section className="tx-section tx-tracking"><motion.div initial="hidden" whileInView="visible" viewport={{ once:true, amount:.2 }} variants={stagger} className="tx-shell"><SectionTitle eyebrow="06 · TRACK & EVALUATE" title="Know exactly where every bid stands." copy="A shared source of truth for bidders, evaluation committees and approvers."/><div className="tx-tracking-grid"><motion.div variants={fadeUp} className="tx-track-panel tx-reveal"><div className="tx-panel-title"><span>TENDER #TX-2048</span><span className="tx-live">In progress</span></div>{[['Submitted',true],['Technical review',true],['Financial review','active'],['Final evaluation',false],['Award',false]].map(([step,state])=><div className={`tx-status ${state===true?'complete':state==='active'?'active':''}`} key={step}><i>{state===true?<Check size={13}/>:''}</i><span>{step}</span>{state==='active'&&<b>Current stage</b>}</div>)}</motion.div><motion.div variants={fadeUp} className="tx-evaluation tx-reveal"><div className="tx-panel-title"><span>TENDER EVALUATION</span><Users size={17}/></div><div className="tx-eval-head"><span>Bidder</span><span>Technical</span><span>Financial</span><span>Overall</span></div>{bidders.map(([name,tech,fin,total],i)=><div className={`tx-eval-row ${i===0?'winner':''}`} key={name}><span>{name}{i===0&&<small>Leading</small>}</span><b>{tech}</b><b>{fin}</b><strong>{total}</strong></div>)}<div className="tx-eval-foot"><span>Approval stage</span><b>Committee review · 3/4</b></div></motion.div></div></motion.div></section>; }

function Benefits({ onOpenRegister }) { const benefits=[['Discover','AI-powered tender discovery','Find relevant opportunities faster','Intelligent tender matching','Centralized tender marketplace'],['Execute','Faster and smarter bidding','AI-assisted bid preparation','Automated document intelligence','Real-time compliance validation'],['Win','Increase bid confidence','Track every submission','Reduce compliance errors','Make data-driven decisions']]; return <><section className="tx-section tx-benefits"><motion.div initial="hidden" whileInView="visible" viewport={{once:true,amount:.2}} variants={stagger} className="tx-shell"><SectionTitle eyebrow="BUILT FOR OUTCOMES" title="Discover. Execute. Win." copy="A unified system that makes complex procurement feel deliberate and measurable." center/><motion.div variants={fadeUp} className="tx-benefit-grid">{benefits.map(([label,title,...points],i)=><motion.article key={label} whileHover={{y:-7}}><span>0{i+1}</span><h3>{label}</h3><h4>{title}</h4>{points.map(p=><p key={p}><Check size={14}/>{p}</p>)}</motion.article>)}</motion.div></motion.div></section><section className="tx-final" id="contact"><div className="tx-final-orb"/><motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}><span className="tx-eyebrow">READY WHEN YOU ARE</span><h2>Your next winning tender<br/><em>starts here.</em></h2><p>Discover opportunities. Build stronger bids. Submit with confidence.</p><div className="tx-hero-actions"><Button onClick={onOpenRegister}>Start with TenderX</Button><Button secondary href="#platform">Explore platform</Button></div></motion.div></section></>; }

function Navbar({ onOpenLogin, onOpenRegister }) { const [open,setOpen]=useState(false); return <header className="tx-nav"><a className="tx-brand" href="#platform"><span>tX</span><b>Tender<em>X</em></b></a><nav>{[['Platform','#platform'],['Solutions','#solutions'],['AI Intelligence','#ai'],['Features','#features'],['About','#contact']].map(([label,href])=><a href={href} key={label}>{label}</a>)}</nav><div className="tx-nav-actions"><button type="button" onClick={onOpenLogin}>Sign in</button><Button onClick={onOpenRegister}>Get started</Button></div><button type="button" aria-label="Open navigation" className="tx-menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>{open&&<motion.div className="tx-mobile-menu" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}>{[['Platform','#platform'],['Solutions','#solutions'],['AI Intelligence','#ai'],['Features','#features']].map(([label,href])=><a onClick={()=>setOpen(false)} href={href} key={label}>{label}</a>)}<button type="button" onClick={onOpenLogin}>Sign in</button><Button onClick={onOpenRegister}>Get started</Button></motion.div>}</header>; }

function Footer() { const columns=[['Product','Tender Discovery','AI Intelligence','Bid Management','Document Management','Evaluation'],['Solutions','Contractors','Enterprises','Government','Procurement Teams'],['Company','About','Contact','Security','Privacy']]; return <footer className="tx-footer"><div className="tx-footer-main"><div><a className="tx-brand" href="#platform"><span>tX</span><b>Tender<em>X</em></b></a><p>Every tender. One intelligent platform.</p></div>{columns.map(([title,...links])=><div key={title}><strong>{title}</strong>{links.map(link=><a href="#platform" key={link}>{link}</a>)}</div>)}</div><div className="tx-footer-bottom"><span>© 2026 TenderX. All rights reserved.</span><span>Secure procurement infrastructure</span></div></footer>; }

export default function TenderXLanding({ onOpenLogin, onOpenRegister }) {
  const rootRef = useRef(null); const reduceMotion = useReducedMotion();
  useEffect(() => { if (reduceMotion) return undefined; const lenis = new Lenis({ duration: 1.1, smoothWheel: true, lerp: .08 }); const ticker=(time)=>lenis.raf(time*1000); gsap.ticker.add(ticker); gsap.ticker.lagSmoothing(0); const ctx=gsap.context(()=>{ gsap.utils.toArray('.tx-reveal').forEach(el=>gsap.fromTo(el,{opacity:.35,y:34},{opacity:1,y:0,duration:.85,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 85%'}})); gsap.to('.tx-hero-stage',{scale:.9,y:70,scrollTrigger:{trigger:'.tx-hero',start:'30% top',end:'bottom top',scrub:1.1}}); },rootRef); return ()=>{ctx.revert();gsap.ticker.remove(ticker);lenis.destroy();}; },[reduceMotion]);
  return <div ref={rootRef} className="tx-landing"><Navbar onOpenLogin={onOpenLogin} onOpenRegister={onOpenRegister}/><main><Hero onOpenLogin={onOpenLogin} onOpenRegister={onOpenRegister}/><Discovery/><Intelligence/><Documents/><Workflow/><BidBuilder/><ValidateAndSubmit/><Tracking/><Benefits onOpenRegister={onOpenRegister}/></main><Footer/></div>;
}
