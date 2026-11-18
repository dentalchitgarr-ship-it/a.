/* Diyar Dent — 4-step booking wizard.
   1) service  2) day  3) morning / noon / evening  4) details + optional note → confirm
   On confirm: saved in the admin panel (book.php) and a ready-made SMS is offered for the clinic's line. */
(function(){
var T={
 fa:{steps:['خدمت','روز','زمان','تأیید'],
  q1:'چه خدمتی لازم دارید؟',h1:'یکی را انتخاب کنید؛ اگر مطمئن نیستید «مشاوره» را بزنید.',
  q2:'کدام روز برایتان مناسب است؟',h2:'روزهای کاری پیش‌رو. زمان دقیق را همکاران ما با شما هماهنگ می‌کنند.',
  q3:'چه بازه‌ای از روز؟',h3:'بازه‌ی ترجیحی خود را انتخاب کنید.',
  q4:'مشخصات و تأیید',h4:'فقط نام و شماره‌ی موبایل لازم است.',
  slots:[['morning','sun','صبح','قبل از ظهر'],['noon','spark','ظهر','حدود ظهر تا بعدازظهر'],['evening','moon','غروب','عصر تا شب'],['any','flex','فرقی نمی‌کند','هر بازه‌ای که نوبت باشد']],
  any:'نزدیک‌ترین نوبت',anyS:'هر روزی که خالی باشد',today:'امروز',tomorrow:'فردا',
  name:'نام و نام خانوادگی',phone:'شماره‌ی موبایل',note:'توضیحات',opt:'اختیاری',notePh:'مثلاً: درد دارم، یا برای مشاوره می‌آیم…',
  next:'بعدی',back:'قبلی',send:'تأیید و ثبت نوبت',sending:'در حال ثبت…',
  eName:'نام را وارد کنید.',ePhone:'شماره‌ی موبایل معتبر وارد کنید (مثال: ۰۹۱۲۱۲۳۴۵۶۷).',eNet:'ثبت آنلاین انجام نشد. می‌توانید پیامک بفرستید یا تماس بگیرید.',
  doneT:'درخواست نوبت شما ثبت شد',doneS:'همکاران ما برای تأیید نهایی زمان با شما تماس می‌گیرند. برای اینکه سریع‌تر دیده شود، پیام آماده‌ی زیر را هم برای کلینیک پیامک کنید.',
  failT:'ثبت آنلاین ممکن نشد',code:'کد پیگیری',smsBtn:'ارسال پیامک به کلینیک',call:'تماس تلفنی',again:'درخواست جدید',
  note2:'نوبت بعد از تأیید همکاران قطعی می‌شود.',
  msg:function(s,c){return 'سلام، درخواست نوبت دارم.\nنام: '+s.name+'\nخدمت: '+s.service+'\nروز: '+s.dayLabel+'\nزمان: '+s.slotLabel+(s.note?'\nتوضیحات: '+s.note:'')+'\nشماره تماس: '+s.phone+(c?'\nکد پیگیری: '+c:'')+'\n— دیار دنت'},
  svc:['ایمپلنت','اوردنچر','کامپوزیت','لمینت','عصب‌کشی','ترمیم دندان','جرم‌گیری','مشاوره / سایر'],loc:'fa-IR-u-ca-persian'},
 en:{steps:['Service','Day','Time','Confirm'],
  q1:'Which service do you need?',h1:'Pick one — choose “Consultation” if you are not sure.',
  q2:'Which day suits you?',h2:'Upcoming working days. We will confirm the exact time with you.',
  q3:'What part of the day?',h3:'Choose your preferred time of day.',
  q4:'Your details',h4:'Only your name and mobile number are required.',
  slots:[['morning','sun','Morning','Before noon'],['noon','spark','Noon','Around noon to afternoon'],['evening','moon','Evening','Late afternoon to night'],['any','flex','Any time','Whenever there is a slot']],
  any:'Earliest slot',anyS:'Any day that is free',today:'Today',tomorrow:'Tomorrow',
  name:'Full name',phone:'Mobile number',note:'Notes',opt:'optional',notePh:'e.g. I have pain, or I am coming for a consultation…',
  next:'Next',back:'Back',send:'Confirm appointment',sending:'Sending…',
  eName:'Please enter your name.',ePhone:'Enter a valid mobile number.',eNet:'Online booking failed. You can send an SMS or call us.',
  doneT:'Your request is registered',doneS:'We will call you to confirm the exact time. To be seen faster, also text the ready-made message below to the clinic.',
  failT:'Online booking failed',code:'Tracking code',smsBtn:'Text the clinic',call:'Call',again:'New request',
  note2:'The appointment is final once our team confirms it.',
  msg:function(s,c){return 'Hello, I would like an appointment.\nName: '+s.name+'\nService: '+s.service+'\nDay: '+s.dayLabel+'\nTime: '+s.slotLabel+(s.note?'\nNotes: '+s.note:'')+'\nPhone: '+s.phone+(c?'\nCode: '+c:'')+'\n— Diyar Dent'},
  svc:['Dental implants','Overdenture','Composite','Laminate veneers','Root canal','Restoration','Scaling','Consultation / other'],loc:'en-US'}
};
var ICONS=['implant','bridge','drop','layers','root','shield','spark','tooth'];
var DIG={'۰':0,'۱':1,'۲':2,'۳':3,'۴':4,'۵':5,'۶':6,'۷':7,'۸':8,'۹':9,'٠':0,'١':1,'٢':2,'٣':3,'٤':4,'٥':5,'٦':6,'٧':7,'٨':8,'٩':9};
function en(s){return String(s).replace(/[۰-۹٠-٩]/g,function(c){return DIG[c]})}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function ic(n){return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function days(L,closed){
 var out=[],now=new Date(),f=function(o,d){try{return new Intl.DateTimeFormat(L.loc,o).format(d)}catch(e){return new Intl.DateTimeFormat('en-US',o).format(d)}};
 for(var i=0;out.length<12&&i<30;i++){
  var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i);
  if(i===0&&now.getHours()>=17)continue;
  if(closed.indexOf(d.getDay())>-1)continue;
  var iso=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  var wd=f({weekday:'long'},d),dn=f({day:'numeric'},d),mn=f({month:'long'},d);
  out.push({iso:iso,wd:wd,dn:dn,mn:mn,tag:i===0?L.today:(i===1?L.tomorrow:''),label:(i===0?L.today+' — ':i===1?L.tomorrow+' — ':'')+wd+' '+dn+' '+mn});
 }
 return out;
}
function mount(el,o){
 if(!el)return;o=o||{};
 var lang=o.lang==='en'?'en':'fa',L=T[lang],closed=o.closed||[5],tel=o.tel||'+982144746759',
  smsNum=(o.sms||o.tel||'').toString(),DAYS=days(L,closed),
  S={step:1,service:'',day:'',dayLabel:'',slot:'',slotLabel:'',name:'',phone:'',note:'',busy:false,err:'',res:null};
 el.classList.add('bkw');
 function stepper(){
  var h='<div class="stp" aria-label="progress">';
  for(var i=1;i<=4;i++){
   h+='<div class="d'+(S.step===i?' on':'')+(S.step>i?' ok':'')+'"><b>'+(S.step>i?ic('check'):i)+'</b>'+esc(L.steps[i-1])+'</div>';
   if(i<4)h+='<div class="ln'+(S.step>i?' ok':'')+'"></div>';
  }
  return h+'</div>';
 }
 function summary(){
  var a=[];if(S.service)a.push(S.service);if(S.dayLabel)a.push(S.dayLabel);if(S.slotLabel)a.push(S.slotLabel);
  return a.length?'<div class="sum">'+a.map(function(x){return '<span>'+esc(x)+'</span>'}).join('')+'</div>':'';
 }
 function nav(canNext,last){
  return '<div class="nav">'+(S.step>1?'<button type="button" class="back" data-a="back">'+ic('arrow')+' '+esc(L.back)+'</button>':'')+'<span class="spc"></span>'+
   '<button type="button" class="btn" data-a="next"'+(canNext&&!S.busy?'':' disabled')+'>'+esc(S.busy?L.sending:(last?L.send:L.next))+'</button></div>';
 }
 function pane(){
  if(S.step===1)return '<h3 class="q">'+esc(L.q1)+'</h3><p class="hint">'+esc(L.h1)+'</p><div class="opt">'+L.svc.map(function(s,i){return '<button type="button" data-svc="'+esc(s)+'" class="'+(S.service===s?'on':'')+'">'+ic(ICONS[i])+esc(s)+'</button>'}).join('')+'</div>'+nav(!!S.service);
  if(S.step===2)return '<h3 class="q">'+esc(L.q2)+'</h3><p class="hint">'+esc(L.h2)+'</p><div class="opt days">'+
   '<button type="button" data-day="any" data-l="'+esc(L.any)+'" class="'+(S.day==='any'?'on':'')+'">'+ic('flex')+'<span>'+esc(L.any)+'</span></button>'+
   DAYS.map(function(d){return '<button type="button" data-day="'+d.iso+'" data-l="'+esc(d.label)+'" class="'+(S.day===d.iso?'on':'')+'"><span>'+esc(d.wd)+'</span><b>'+esc(d.dn)+'</b><small>'+esc(d.tag||d.mn)+'</small></button>'}).join('')+'</div>'+nav(!!S.day);
  if(S.step===3)return '<h3 class="q">'+esc(L.q3)+'</h3><p class="hint">'+esc(L.h3)+'</p><div class="opt slots">'+L.slots.map(function(s){return '<button type="button" data-slot="'+s[0]+'" data-l="'+esc(s[2])+'" class="'+(S.slot===s[0]?'on':'')+'">'+ic(s[1])+esc(s[2])+'<small>'+esc(s[3])+'</small></button>'}).join('')+'</div>'+nav(!!S.slot);
  return '<h3 class="q">'+esc(L.q4)+'</h3><p class="hint">'+esc(L.h4)+'</p>'+summary()+
   '<label class="fld" id="fn">'+esc(L.name)+'<input name="name" maxlength="80" autocomplete="name" value="'+esc(S.name)+'"></label>'+
   '<label class="fld" id="fp">'+esc(L.phone)+'<input name="phone" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" dir="ltr" placeholder="09xxxxxxxxx" value="'+esc(S.phone)+'"></label>'+
   '<label class="fld">'+esc(L.note)+' <em>'+esc(L.opt)+'</em><textarea name="note" rows="3" maxlength="400" placeholder="'+esc(L.notePh)+'">'+esc(S.note)+'</textarea></label>'+
   '<input name="website" tabindex="-1" autocomplete="off" style="position:absolute;opacity:0;width:0;height:0;border:0;padding:0;pointer-events:none" aria-hidden="true">'+
   '<div class="err" role="alert">'+esc(S.err)+'</div>'+nav(true,true)+'<p class="note">'+esc(L.note2)+'</p>';
 }
 function smsHref(txt){
  var ios=/iPhone|iPad|iPod/.test(navigator.userAgent),n=en(smsNum).replace(/[^0-9+]/g,'');
  return 'sms:'+n+(ios?'&':'?')+'body='+encodeURIComponent(txt);
 }
 function done(){
  var r=S.res,txt=L.msg(S,r.code||''),ok=r.ok;
  return '<div class="done pane"><div class="ok">'+ic(ok?'check':'chat')+'</div><h3 class="q">'+esc(ok?L.doneT:L.failT)+'</h3>'+
   (ok&&r.code?'<div class="code">'+esc(r.code)+'</div>':'')+
   '<p class="hint">'+esc(ok?L.doneS:L.eNet)+'</p>'+summary()+
   '<div class="msgbox" dir="'+(lang==='fa'?'rtl':'ltr')+'">'+esc(txt)+'</div>'+
   '<div class="acts"><a class="btn" href="'+esc(smsHref(txt))+'">'+ic('chat')+esc(L.smsBtn)+'</a><a class="btn ghost" href="tel:'+esc(tel)+'">'+ic('phone')+esc(L.call)+'</a></div>'+
   '<p class="note"><button type="button" class="back" data-a="again">'+esc(L.again)+'</button></p></div>';
 }
 function draw(keepFocus){
  el.innerHTML=S.res?done():stepper()+'<div class="pane" id="bkp">'+pane()+'</div>';
  if(window.revealScan)window.revealScan();
 }
 function valid(){
  var n=S.name.trim(),p=en(S.phone).replace(/[^0-9+]/g,'');
  if(n.length<2){S.err=L.eName;return 'fn'}
  if(!/^(\+?98|0098|0)?9\d{9}$/.test(p)){S.err=L.ePhone;return 'fp'}
  S.err='';return '';
 }
 async function submit(){
  var bad=valid();
  if(bad){draw();var f=el.querySelector('#'+bad);if(f){f.classList.add('bad');var i=f.querySelector('input');if(i)i.focus()}return}
  S.busy=true;draw();
  var body={name:S.name.trim(),phone:en(S.phone).replace(/[^0-9+]/g,''),service:S.service,day:S.day,dayLabel:S.dayLabel,slot:S.slot,slotLabel:S.slotLabel,note:S.note.trim(),website:(el.querySelector('[name=website]')||{}).value||''};
  var r={ok:false};
  try{
   var x=await fetch('book.php',{method:'POST',headers:{'Content-Type':'application/json','X-Req':'1'},body:JSON.stringify(body)}),j=await x.json();
   if(j&&j.ok)r={ok:true,code:j.code||''};
  }catch(e){}
  S.busy=false;S.res=r;S.name=body.name;S.phone=body.phone;S.note=body.note;draw();
  var h=el.querySelector('.done');if(h&&h.scrollIntoView)h.scrollIntoView({behavior:'smooth',block:'center'});
 }
 el.onclick=function(e){
  var b=e.target.closest('button');if(!b||!el.contains(b))return;
  if(b.dataset.svc!==undefined){S.service=b.dataset.svc;draw();return}
  if(b.dataset.day!==undefined){S.day=b.dataset.day;S.dayLabel=b.dataset.l;draw();return}
  if(b.dataset.slot!==undefined){S.slot=b.dataset.slot;S.slotLabel=b.dataset.l;draw();return}
  var a=b.dataset.a;
  if(a==='back'){S.step=Math.max(1,S.step-1);S.err='';draw();return}
  if(a==='again'){S.step=1;S.service=S.day=S.dayLabel=S.slot=S.slotLabel=S.note='';S.res=null;draw();return}
  if(a==='next'){if(S.busy)return;if(S.step<4){S.step++;draw();var s=el.getBoundingClientRect();if(s.top<0)el.scrollIntoView({behavior:'smooth',block:'start'})}else submit()}
 };
 el.oninput=function(e){var n=e.target.name;if(n==='name'||n==='phone'||n==='note'){S[n]=e.target.value;var f=e.target.closest('.fld');if(f)f.classList.remove('bad')}};
 draw();
}
window.BK={mount:mount};
})();
