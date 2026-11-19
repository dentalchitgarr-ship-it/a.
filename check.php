<?php
/* Diyar Dent — server check. Open /check.php once after upload, then DELETE this file. */
header('Content-Type: text/html; charset=utf-8');header('Cache-Control: no-store');
$root=__DIR__;$rows=[];
function row(&$r,$t,$ok,$d=''){$r[]=[$t,$ok,$d];}
row($rows,'نسخه‌ی PHP ('.PHP_VERSION.')',version_compare(PHP_VERSION,'7.3.0','>='),'حداقل ۷٫۳ لازم است؛ از DirectAdmin → Select PHP Version نسخه‌ی ۸ را انتخاب کنید.');
foreach(['json','mbstring','session','fileinfo'] as $e)row($rows,'افزونه‌ی '.$e,extension_loaded($e),'در Select PHP Version فعالش کنید.');
row($rows,'random_bytes',function_exists('random_bytes'));
row($rows,'getimagesize (برای آپلود عکس)',function_exists('getimagesize'),'افزونه‌ی gd یا exif را فعال کنید.');
foreach(['data','uploads'] as $d)row($rows,"پوشه‌ی $d قابل نوشتن",is_dir("$root/$d")&&is_writable("$root/$d"),'در File Manager → Permissions عدد 755 (یا اگر نشد 775) بدهید.');
foreach(['data/bookings.json','data/admin.json','data/rl.json'] as $f)row($rows,"فایل $f قابل نوشتن",is_file("$root/$f")&&is_writable("$root/$f"),'Permissions: 644 یا 664.');
row($rows,'config.json قابل نوشتن (ذخیره از پنل مدیریت)',is_file("$root/config.json")&&is_writable("$root/config.json"),'Permissions: 664 (یا 666 اگر نشد).');
$sp=session_save_path();row($rows,'مسیر session قابل نوشتن',$sp===''||is_writable($sp),'ورود به پنل بدون session کار نمی‌کند.');
row($rows,'ارسال خودکار پیامک (اختیاری)',is_file("$root/data/sms.json"),'فایل data/sms.json را با کلید API بسازید (در book.php توضیح داده شده).');
?><!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>بررسی سرور</title>
<style>body{font:16px/1.9 Tahoma,sans-serif;background:#0b0a08;color:#f3ece0;max-width:720px;margin:0 auto;padding:1rem}li{margin:.4rem 0;padding:.5rem .8rem;border-radius:10px;background:#17130e;list-style:none}.ok{color:#7fd48a}.no{color:#ff8a80}small{display:block;color:#cdbf9f}h1{color:#d9b66a}</style>
<h1>بررسی سرور دیار دنت</h1><ul id="l">
<?php foreach($rows as $r): ?><li><b class="<?= $r[1]?'ok':'no' ?>"><?= $r[1]?'✔':'✘' ?></b> <?= htmlspecialchars($r[0]) ?><?php if(!$r[1]&&$r[2]): ?><small><?= htmlspecialchars($r[2]) ?></small><?php endif; ?></li><?php endforeach; ?>
</ul><ul id="pub"></ul>
<p>بعد از اتمام بررسی، فایل <code>check.php</code> را از سرور پاک کنید.</p>
<script>
/* data/ must NOT be readable from the web */
['data/admin.json','data/bookings.json'].forEach(function(f){fetch(f+'?'+Date.now()).then(function(r){var li=document.createElement('li');
 if(r.status===200){li.innerHTML='<b class="no">✘</b> '+f+' از بیرون قابل دیدن است!<small>.htaccess اعمال نمی‌شود (سرور Nginx؟). از پشتیبانی هاست بخواهید دسترسی به پوشه‌ی data را ببندد.</small>'}
 else li.innerHTML='<b class="ok">✔</b> '+f+' از بیرون بسته است';document.getElementById('pub').appendChild(li)}).catch(function(){})});
</script></html>
