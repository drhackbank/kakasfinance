/* kakasfinance — script.js v1.0.0
   Sections: Auth · Nav · API defs · Mock · Tester · Fire · Metrics · History · Toast
*/
'use strict';

/* ── Auth (SHA-256 hash comparison — plain credentials never stored) ── */
const _EH = '85b7bd7ce9ff5fef7689a607348d633a960b7065f55b75b6b0bbb4de05de706c';
const _PH = 'e754ea4c20d8943d01eaaff4809e560ab155c6e94fce7774cd1b0e7173806590';

async function _h(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

/* ── Axis Bank endpoints ────────────────────────────────────── */
const EP = {
  salary:   'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/salary',
  txn:      'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/transaction/status',
  transfer: 'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/transfer',
  acval:    'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/account/validate',
  vpa:      'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/upi/fetchvpa',
};

/* ── Session state ─────────────────────────────────────────── */
const S = { calls:0, ok:0, err:0, ms:0, hist:[], built:new Set() };

/* ── API definitions ───────────────────────────────────────── */
const D = new Date().toISOString().split('T')[0];
const APIS = {
  salary: {
    label:'Salary Payment', method:'POST', url:EP.salary,
    fields:[
      {id:'s_cid', l:'Client ID',             t:'req',   p:'xxxx-xxxx-xxxx-xxxx'},
      {id:'s_cs',  l:'Client Secret',          t:'req',   p:'xxxxxxxxxxxxxxxxxxxxxxxx', ty:'password'},
      {id:'s_tok', l:'OAuth Access Token',     t:'oauth', p:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx'},
      {id:'s_ibm', l:'X-IBM-Client-Id',        t:'req',   p:'xxxx-xxxx-xxxx'},
      {id:'s_cor', l:'Corporate Account No.',  t:'req',   p:'xxxxxxxxxxxxxxx'},
      {id:'s_deb', l:'Debit Account No.',      t:'req',   p:'xxxxxxxxxxxxxxx'},
      {id:'s_bat', l:'Batch Reference ID',     t:'opt',   p:'BATCH-'+D+'-001'},
      {id:'s_hmac',l:'HMAC / Checksum Key',    t:'req',   p:'xxxxxxxxxxxxxxxxxxxxxxxx', ty:'password'},
    ],
    body:JSON.stringify({corporateAccountNo:'xxxxxxxxxxxxxxx',debitAccount:'xxxxxxxxxxxxxxx',batchRefId:'BATCH-'+D+'-001',paymentDate:D,transactions:[{beneficiaryAccount:'xxxxxxxxxxxxxxx',beneficiaryIFSC:'AXIS0000001',beneficiaryName:'RAHUL SHARMA',amount:50000,employeeId:'EMP001',remarks:'May 2026 Salary'}]},null,2),
  },
  txn: {
    label:'Transaction Status', method:'GET', url:EP.txn,
    fields:[
      {id:'t_cid',l:'Client ID',           t:'req',   p:'xxxx-xxxx-xxxx-xxxx'},
      {id:'t_tok',l:'OAuth Access Token',  t:'oauth', p:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx'},
      {id:'t_ibm',l:'X-IBM-Client-Id',     t:'req',   p:'xxxx-xxxx-xxxx'},
      {id:'t_ref',l:'Transaction Ref No.', t:'req',   p:'TXN-xxxxxxxxxxxx'},
      {id:'t_utr',l:'UTR Number',          t:'opt',   p:'UTRxxxxxxxxxxxxxxx'},
      {id:'t_ch', l:'Channel ID',          t:'opt',   p:'CORP_API'},
    ],
    body:'',
  },
  transfer: {
    label:'Transfer Payment', method:'POST', url:EP.transfer,
    fields:[
      {id:'tr_cid', l:'Client ID',           t:'req',   p:'xxxx-xxxx-xxxx-xxxx'},
      {id:'tr_cs',  l:'Client Secret',       t:'req',   p:'xxxxxxxxxxxxxxxxxxxxxxxx', ty:'password'},
      {id:'tr_tok', l:'OAuth Access Token',  t:'oauth', p:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx'},
      {id:'tr_ibm', l:'X-IBM-Client-Id',     t:'req',   p:'xxxx-xxxx-xxxx'},
      {id:'tr_deb', l:'Debit Account No.',   t:'req',   p:'xxxxxxxxxxxxxxx'},
      {id:'tr_ben', l:'Beneficiary Account', t:'req',   p:'xxxxxxxxxxxxxxx'},
      {id:'tr_if',  l:'Beneficiary IFSC',    t:'req',   p:'AXIS0000001'},
      {id:'tr_mod', l:'Transfer Mode',       t:'req',   p:'IMPS / NEFT / RTGS'},
      {id:'tr_hmac',l:'HMAC / Checksum Key', t:'req',   p:'xxxxxxxxxxxxxxxxxxxxxxxx', ty:'password'},
      {id:'tr_hook',l:'Webhook URL',         t:'opt',   p:'https://your-app.com/webhook'},
    ],
    body:JSON.stringify({debitAccount:'xxxxxxxxxxxxxxx',beneficiaryAccount:'xxxxxxxxxxxxxxx',beneficiaryIFSC:'AXIS0000001',beneficiaryName:'RAHUL SHARMA',amount:10000,transferMode:'IMPS',remarks:'Invoice 2026-001',uniqueRefNo:'REF-'+Date.now()},null,2),
  },
  acval: {
    label:'Account Validation', method:'POST', url:EP.acval,
    fields:[
      {id:'av_cid', l:'Client ID',               t:'req',   p:'xxxx-xxxx-xxxx-xxxx'},
      {id:'av_tok', l:'OAuth Access Token',      t:'oauth', p:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx'},
      {id:'av_ibm', l:'X-IBM-Client-Id',         t:'req',   p:'xxxx-xxxx-xxxx'},
      {id:'av_ac',  l:'Beneficiary Account No.', t:'req',   p:'xxxxxxxxxxxxxxx'},
      {id:'av_if',  l:'Beneficiary IFSC',        t:'req',   p:'AXIS0000001'},
      {id:'av_mod', l:'Validation Mode',         t:'opt',   p:'PENNY_DROP / NAME_MATCH'},
      {id:'av_hmac',l:'HMAC / Checksum Key',     t:'req',   p:'xxxxxxxxxxxxxxxxxxxxxxxx', ty:'password'},
    ],
    body:JSON.stringify({beneficiaryAccount:'xxxxxxxxxxxxxxx',beneficiaryIFSC:'AXIS0000001',validationMode:'NAME_MATCH',corpRefId:'VAL-'+Date.now()},null,2),
  },
  vpa: {
    label:'Fetch VPA', method:'POST', url:EP.vpa,
    fields:[
      {id:'vp_cid', l:'Client ID',             t:'req',   p:'xxxx-xxxx-xxxx-xxxx'},
      {id:'vp_cs',  l:'Client Secret',         t:'req',   p:'xxxxxxxxxxxxxxxxxxxxxxxx', ty:'password'},
      {id:'vp_tok', l:'OAuth Access Token',    t:'oauth', p:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx'},
      {id:'vp_ibm', l:'X-IBM-Client-Id',       t:'req',   p:'xxxx-xxxx-xxxx'},
      {id:'vp_vpa', l:'VPA Address',           t:'req',   p:'name@axisbank / name@upi'},
      {id:'vp_cor', l:'Corporate Account No.', t:'req',   p:'xxxxxxxxxxxxxxx'},
      {id:'vp_pur', l:'Purpose Code',          t:'opt',   p:'P2B / P2P'},
      {id:'vp_hmac',l:'HMAC / Checksum Key',   t:'req',   p:'xxxxxxxxxxxxxxxxxxxxxxxx', ty:'password'},
    ],
    body:JSON.stringify({vpaAddress:'rahulsharma@axisbank',corporateAccountNo:'xxxxxxxxxxxxxxx',purposeCode:'P2B'},null,2),
  },
};

/* ── Mock responses ────────────────────────────────────────── */
const ts = () => new Date().toISOString();
const MOCK = {
  salary:   {status:'SUCCESS',batchRefId:'BATCH-'+D+'-001',batchId:'AXS2026001234',totalTransactions:1,successCount:1,failureCount:0,transactions:[{employeeId:'EMP001',status:'PROCESSED',utr:'AXIS2026050600001',amount:50000,timestamp:ts()}],processedAt:ts()},
  txn:      {status:'SUCCESS',transactionRef:'TXN-xxxxxxxxxxxx',utr:'AXIS2026050600123',paymentStatus:'CREDITED',amount:10000,beneficiaryName:'RAHUL SHARMA',beneficiaryAccount:'xxxxxxxxxxxxxxx',transferMode:'IMPS',creditedAt:ts()},
  transfer: {status:'SUCCESS',uniqueRefNo:'REF-2026-001',utr:'AXIS2026050600789',bankRefNo:'AXS78901234',amount:10000,transferMode:'IMPS',beneficiaryName:'RAHUL SHARMA',processedAt:ts()},
  acval:    {status:'SUCCESS',accountNumber:'xxxxxxxxxxxxxxx',ifsc:'AXIS0000001',accountHolderName:'RAHUL SHARMA',bankName:'AXIS BANK LIMITED',validationStatus:'VALID',nameMatchScore:98,validatedAt:ts()},
  vpa:      {status:'SUCCESS',vpaAddress:'rahulsharma@axisbank',accountHolderName:'RAHUL SHARMA',vpaStatus:'ACTIVE',bankName:'AXIS BANK LIMITED',purposeCode:'P2B',resolvedAt:ts()},
};
const M401 = {status:'FAILURE',errorCode:'AUTH_001',httpStatus:401,errorMessage:'Invalid or missing OAuth token. Provide a valid Bearer token in the Authorization header.',timestamp:ts()};
const CORS  = '/* CORS note — request blocked by browser (expected locally)\n   Deploy to Vercel → api/*.js handles CORS server-side\n   Or: vercel dev  |  Postman  |  cURL\n   Sandbox mock below:\n*/\n\n';

/* ── DOM helper ────────────────────────────────────────────── */
const g = id => document.getElementById(id);

/* ── Auth ──────────────────────────────────────────────────── */
async function doLogin() {
  if (_checkLock()) return;
  const email = g('lid').value.trim();
  const pass  = g('lpw').value;
  const errEl = g('ferr'), spin = g('lspin'), icon = g('licon'), txt = g('ltxt');
  errEl.classList.remove('show');
  ['lid','lpw'].forEach(id => g(id) && g(id).classList.remove('err'));
  spin.classList.add('on'); icon.style.display = 'none'; txt.textContent = 'Authorizing…';
  const [eh, ph] = await Promise.all([_h(email), _h(pass)]);
  setTimeout(() => {
    spin.classList.remove('on'); icon.style.display = ''; txt.textContent = 'Authorize with OAuth';
    if (eh === _EH && ph === _PH) {
      _attempts = 0;
      g('scr-login').classList.remove('active');
      g('scr-dash').classList.add('active');
      nav('home');
    } else {
      _attempts++;
      if (_attempts >= 3) { _lockedUntil = Date.now() + 30000; _attempts = 0; }
      errEl.classList.add('show');
      ['lid','lpw'].forEach(id => g(id) && g(id).classList.add('err'));
    }
  }, 1400);
}

function doLogout() {
  g('scr-dash').classList.remove('active');
  g('scr-login').classList.add('active');
}

let _attempts = 0, _lockedUntil = 0;
function _checkLock() {
  if (_lockedUntil > Date.now()) {
    const secs = Math.ceil((_lockedUntil - Date.now()) / 1000);
    const e = g('ferr');
    e.innerHTML = '<i class="ti ti-lock" style="font-size:11px;vertical-align:-1px"></i> Too many attempts. Try again in ' + secs + 's';
    e.classList.add('show');
    return true;
  }
  return false;
}

function togglePw() {
  const i = g('lpw'), ic = g('pw-eye');
  const h = i.type === 'password';
  i.type = h ? 'text' : 'password';
  ic.className = h ? 'ti ti-eye-off' : 'ti ti-eye';
}

/* ── Navigation ────────────────────────────────────────────── */
function nav(key) {
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
  document.querySelectorAll('.fscr').forEach(s => s.classList.remove('on'));
  const ni = g('ni-'+key), fs = g('fs-'+key);
  if (ni) ni.classList.add('on');
  if (fs) fs.classList.add('on');
  if (APIS[key] && !S.built.has(key)) { buildTester(key); S.built.add(key); }
  const hb = g('hist-badge'); if (hb) hb.textContent = S.hist.length;
}

/* ── Tag badge ─────────────────────────────────────────────── */
function tb(t) {
  const c = {req:'tr',opt:'to',oauth:'toa'};
  const l = {req:'Required',opt:'Optional',oauth:'OAuth'};
  return `<span class="tag ${c[t]||'to'}">${l[t]||t}</span>`;
}

/* ── Build tester panel ────────────────────────────────────── */
function buildTester(key) {
  const api = APIS[key], el = g('tg-'+key);
  if (!api || !el) return;
  const fields = api.fields.map(f =>
    `<label class="afl">${f.l} ${tb(f.t)}</label>
     <input class="afi" id="${f.id}" type="${f.ty||'text'}" placeholder="${f.p}" autocomplete="off" spellcheck="false"/>`
  ).join('');
  const bodyBtn  = api.method==='POST' ? `<button class="tab" onclick="swtab('${key}','body')" id="tab-body-${key}">Body</button>` : '';
  const bodyPane = api.method==='POST' ? `<div class="pane" id="tp-body-${key}"><label class="afl">Request body (JSON — editable)</label><textarea class="afta" id="body-${key}">${api.body}</textarea></div>` : '';
  el.innerHTML = `
  <div class="panel">
    <div class="phdr">
      <div class="phdr-t"><i class="ti ti-send"></i> Request</div>
      <span class="mbadge ${api.method==='POST'?'post':'get'}">${api.method}</span>
    </div>
    <div class="pbody">
      <span class="ep-pill">${api.url}</span>
      <div class="tabs">
        <button class="tab on" onclick="swtab('${key}','params')"  id="tab-params-${key}">Params</button>
        <button class="tab"    onclick="swtab('${key}','headers')" id="tab-headers-${key}">Headers</button>
        ${bodyBtn}
      </div>
      <div class="pane on" id="tp-params-${key}">${fields}</div>
      <div class="pane"    id="tp-headers-${key}">
        <div class="hdr-head"><span>Name</span><span>Value</span><span></span></div>
        <div id="hdrs-${key}">
          <div class="hdr-row"><input class="afi" value="Content-Type"/><input class="afi" value="application/json"/><button class="hdr-del" onclick="this.parentElement.remove()">×</button></div>
          <div class="hdr-row"><input class="afi" value="Authorization"/><input class="afi" placeholder="Bearer xxxx"/><button class="hdr-del" onclick="this.parentElement.remove()">×</button></div>
          <div class="hdr-row"><input class="afi" value="X-IBM-Client-Id"/><input class="afi" placeholder="xxxx-xxxx"/><button class="hdr-del" onclick="this.parentElement.remove()">×</button></div>
        </div>
        <button class="btn-add-hdr" onclick="addHdr('${key}')"><i class="ti ti-plus" style="font-size:11px"></i> Add header</button>
      </div>
      ${bodyPane}
      <button class="btn-send" id="sendbtn-${key}" onclick="fire('${key}')">
        <i class="ti ti-player-play" style="font-size:11px" id="sicon-${key}"></i>
        <span id="stxt-${key}">Send Request</span>
        <span class="sspin" id="sspin-${key}"></span>
      </button>
    </div>
  </div>
  <div class="panel">
    <div class="phdr">
      <div class="phdr-t"><i class="ti ti-code"></i> Response</div>
      <button class="btn-copy" id="cbtn-${key}" onclick="copyR('${key}')"><i class="ti ti-copy" style="font-size:10px"></i> Copy</button>
    </div>
    <div class="pbody" style="padding:10px">
      <div class="ridle" id="ridle-${key}">
        <i class="ti ti-player-play"></i>
        <span>Hit <strong>Send Request</strong> to fire the API</span>
        <small>No token → sandbox mock &nbsp;·&nbsp; valid token → live Axis Bank call</small>
      </div>
      <pre class="rbody" id="rbody-${key}"></pre>
    </div>
    <div class="sbar" id="sbar-${key}">
      <span class="sc-nil" id="sc-${key}">—</span>
      <span class="sc-ct"  id="ct-${key}"></span>
      <span class="sc-ms"  id="ms-${key}"></span>
    </div>
  </div>`;
}

function swtab(key, t) {
  ['params','headers','body'].forEach(x => {
    const tp=g('tp-'+x+'-'+key), tb2=g('tab-'+x+'-'+key);
    if(tp) tp.classList.remove('on'); if(tb2) tb2.classList.remove('on');
  });
  const tp=g('tp-'+t+'-'+key), tb2=g('tab-'+t+'-'+key);
  if(tp) tp.classList.add('on'); if(tb2) tb2.classList.add('on');
}

function addHdr(key) {
  const c=g('hdrs-'+key); if(!c) return;
  const r=document.createElement('div'); r.className='hdr-row';
  r.innerHTML='<input class="afi" placeholder="Header name"/><input class="afi" placeholder="Value"/><button class="hdr-del" onclick="this.parentElement.remove()">×</button>';
  c.appendChild(r);
}

/* ── Fire request ──────────────────────────────────────────── */
async function fire(key) {
  const api=APIS[key];
  const btn=g('sendbtn-'+key), spin=g('sspin-'+key), icon=g('sicon-'+key), txt=g('stxt-'+key);
  const idle=g('ridle-'+key), rb=g('rbody-'+key);
  const scEl=g('sc-'+key), ctEl=g('ct-'+key), msEl=g('ms-'+key);
  if (!api||!btn) return;

  btn.disabled=true; spin.style.display='inline-block'; icon.style.display='none'; txt.textContent='Sending…';
  if(idle) idle.style.display='none';
  if(rb){ rb.style.display='none'; rb.className='rbody'; }

  const tokEl=document.querySelector(`#tg-${key} input[placeholder^="Bearer"]`);
  const rawTok=tokEl?tokEl.value.trim():'';
  const hasTok=rawTok.startsWith('Bearer ')&&rawTok.length>15;

  const t0=performance.now();
  let code, text, isOk=false;

  if (hasTok) {
    try {
      const hdrs={'Content-Type':'application/json','Accept':'application/json','Authorization':rawTok};
      const ibmEl=document.querySelector(`#tg-${key} input[id$="_ibm"]`);
      if(ibmEl&&ibmEl.value.trim()) hdrs['X-IBM-Client-Id']=ibmEl.value.trim();
      document.querySelectorAll(`#hdrs-${key} .hdr-row`).forEach(row=>{
        const ins=row.querySelectorAll('input');
        if(ins.length>=2&&ins[0].value&&ins[1].value) hdrs[ins[0].value]=ins[1].value;
      });
      const opts={method:api.method,headers:hdrs};
      if(api.method==='POST'){const be=g('body-'+key); opts.body=be?be.value:'{}';}
      let url=api.url;
      if(api.method==='GET'){
        const p=new URLSearchParams({channelId:'CORP_API'});
        const re=g('t_ref'),ue=g('t_utr');
        if(re&&re.value) p.set('transactionRefNo',re.value.trim());
        if(ue&&ue.value) p.set('utrNo',ue.value.trim());
        url+='?'+p.toString();
      }
      const res=await fetch(url,opts);
      code=res.status; isOk=res.ok;
      try{text=JSON.stringify(await res.json(),null,2);}catch{text=await res.text();}
    } catch(e){
      code=200; isOk=true;
      text=CORS+JSON.stringify(MOCK[key],null,2);
    }
  } else {
    await new Promise(r=>setTimeout(r,500+Math.random()*600));
    const ce=document.querySelector(`#tg-${key} input[id$="_cid"]`);
    const hasCid=ce&&ce.value.trim().length>5;
    code=hasCid?200:401; isOk=hasCid;
    text=JSON.stringify(hasCid?MOCK[key]:M401,null,2);
  }

  const el=Math.round(performance.now()-t0);
  if(rb){rb.textContent=text;rb.className='rbody '+(isOk?'ok':'bad');rb.style.display='block';}
  if(scEl){scEl.className=isOk?'sc-ok':'sc-err';scEl.textContent=isOk?`${code} OK`:`${code}${code===401?' Unauthorized':code===400?' Bad Request':' Error'}`;}
  if(ctEl) ctEl.textContent='application/json';
  if(msEl) msEl.textContent=el+'ms';

  btn.disabled=false; spin.style.display='none'; icon.style.display=''; txt.textContent='Send Request';
  S.calls++; if(isOk) S.ok++; else S.err++; S.ms+=el;
  updM();
  S.hist.unshift({key,method:api.method,url:api.url,code,ms:el,ok:isOk,name:api.label,time:new Date().toLocaleTimeString()});
  renderHist();
  const hb=g('hist-badge'); if(hb) hb.textContent=S.hist.length;
}

/* ── Metrics ───────────────────────────────────────────────── */
function updM() {
  const avg=S.calls>0?Math.round(S.ms/S.calls)+'ms':'—';
  [['m-calls',S.calls],['m-ok',S.ok],['m-err',S.err],['m-avg',avg]].forEach(([id,v])=>{
    const el=g(id); if(!el) return;
    el.textContent=v; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  });
}

/* ── Copy ──────────────────────────────────────────────────── */
function copyR(key) {
  const el=g('rbody-'+key),btn=g('cbtn-'+key);
  if(!el||!el.textContent.trim()){toast('Nothing to copy','ti-alert-triangle');return;}
  navigator.clipboard.writeText(el.textContent).then(()=>{
    btn.classList.add('done');
    btn.innerHTML='<i class="ti ti-check" style="font-size:10px"></i> Copied';
    setTimeout(()=>{btn.classList.remove('done');btn.innerHTML='<i class="ti ti-copy" style="font-size:10px"></i> Copy';},1800);
    toast('Copied to clipboard');
  }).catch(()=>toast('Copy failed — try manually','ti-x'));
}

/* ── History ───────────────────────────────────────────────── */
function renderHist() {
  const c=g('hist-list'); if(!c) return;
  if(!S.hist.length){c.innerHTML='<div class="hist-empty"><i class="ti ti-history"></i>No requests yet.<br>Fire a test in any API module.</div>';return;}
  c.innerHTML=S.hist.map(h=>`
    <div class="hitem" onclick="nav('${h.key}')">
      <span class="mbadge ${h.method==='POST'?'post':'get'}" style="font-size:9px">${h.method}</span>
      <span class="h-url">${h.url}</span>
      <span class="h-sc ${h.ok?'ok':'bad'}">${h.code}</span>
      <span class="h-ms">${h.ms}ms</span>
      <span class="h-ts">${h.time}</span>
    </div>`).join('');
}

function clearHist(){S.hist=[];renderHist();const hb=g('hist-badge');if(hb)hb.textContent='0';toast('History cleared');}

/* ── Toast ─────────────────────────────────────────────────── */
function toast(msg,icon='ti-circle-check'){
  const t=g('toast'); if(!t) return;
  t.innerHTML=`<i class="ti ${icon}"></i> ${msg}`;
  t.classList.add('on'); clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('on'),2700);
}

/* ── Bootstrap ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  ['lid','lpw'].forEach(id=>{
    const el=g(id); if(!el) return;
    el.addEventListener('keydown',e=>{if(e.key==='Enter') doLogin();});
    el.addEventListener('input',()=>{el.classList.remove('err');const fe=g('ferr');if(fe) fe.classList.remove('show');});
  });
  renderHist();
});

Object.assign(window,{doLogin,doLogout,togglePw,nav,swtab,addHdr,fire,copyR,clearHist,toast});
