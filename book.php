<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
if($_SERVER['REQUEST_METHOD']!=='POST'||empty($_SERVER['HTTP_X_REQ'])){http_response_code(400);echo '{"ok":false}';exit;}
$b=json_decode((string)file_get_contents('php://input'),true);if(!is_array($b)){http_response_code(400);echo '{"ok":false}';exit;}
if(!empty($b['website'])){echo '{"ok":true}';exit;}
$dig=['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9'];
$cl=function($s,$n){return mb_substr(trim(strip_tags((string)$s)),0,$n);};
$name=$cl($b['name']??'',80);$phone=preg_replace('/[^0-9+]/','',strtr((string)($b['phone']??''),$dig));$svc=$cl($b['service']??'',80);$note=$cl($b['note']??'',500);
$day=$cl($b['day']??'',12);$dayLabel=$cl($b['dayLabel']??'',60);$slotLabel=$cl($b['slotLabel']??'',30);
$slot=in_array(($b['slot']??''),['morning','noon','evening','any'],true)?$b['slot']:'';
if(mb_strlen($name)<2||strlen($phone)<7||strlen($phone)>15){http_response_code(400);echo '{"ok":false}';exit;}
$data=__DIR__.'/data';$fp=fopen($data.'/rl.json','c+');flock($fp,LOCK_EX);$d=json_decode((string)stream_get_contents($fp),true);if(!is_array($d))$d=[];$now=time();$k='bk'.hash('sha256',$_SERVER['REMOTE_ADDR']??'');
foreach($d as $kk=>$v){$d[$kk]=array_values(array_filter($v,function($t)use($now){return $t>$now-3600;}));if(!$d[$kk])unset($d[$kk]);}
if(count($d[$k]??[])>=5){flock($fp,LOCK_UN);fclose($fp);http_response_code(429);echo '{"ok":false}';exit;}
$d[$k][]=$now;ftruncate($fp,0);rewind($fp);fwrite($fp,json_encode($d));flock($fp,LOCK_UN);fclose($fp);
$code=strtoupper(substr(strtr(bin2hex(random_bytes(4)),'01','XY'),0,6));
$f=$data.'/bookings.json';$fp=fopen($f,'c+');flock($fp,LOCK_EX);$l=json_decode((string)stream_get_contents($fp),true);if(!is_array($l))$l=[];
$l[]=['id'=>bin2hex(random_bytes(6)),'code'=>$code,'t'=>date('Y-m-d H:i'),'name'=>$name,'phone'=>$phone,'service'=>$svc,'day'=>$day,'dayLabel'=>$dayLabel,'slot'=>$slot,'slotLabel'=>$slotLabel,'note'=>$note,'status'=>'new'];
ftruncate($fp,0);rewind($fp);fwrite($fp,json_encode($l,JSON_UNESCAPED_UNICODE));flock($fp,LOCK_UN);fclose($fp);

/* Optional automatic SMS to the clinic (Kavenegar). Create data/sms.json:
   {"apikey":"...","receptor":"09xxxxxxxxx","sender":""}   (sender optional) */
$sf=$data.'/sms.json';
if(is_file($sf)){
  $c=json_decode((string)file_get_contents($sf),true);
  if(is_array($c)&&!empty($c['apikey'])&&!empty($c['receptor'])){
    $msg="نوبت جدید دیار دنت\n".$name.' - '.$phone."\n".$svc."\n".trim($dayLabel.' '.$slotLabel).($note!==''?"\n".$note:'')."\nکد: ".$code;
    $q=['receptor'=>$c['receptor'],'message'=>$msg];if(!empty($c['sender']))$q['sender']=$c['sender'];
    $url='https://api.kavenegar.com/v1/'.rawurlencode($c['apikey']).'/sms/send.json?'.http_build_query($q);
    @file_get_contents($url,false,stream_context_create(['http'=>['timeout'=>4,'ignore_errors'=>true]]));
  }
}
echo json_encode(['ok'=>true,'code'=>$code]);
