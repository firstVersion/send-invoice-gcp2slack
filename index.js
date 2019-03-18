/**
 * Triggered from a change to a Cloud Storage bucket.
 *
 * @param {!Object} event Event payload and metadata.
 * @param {!Function} callback Callback function to signal completion.
 */

exports.notifySlack = (request, response) => {
  const   slackAPIToken = process.env.SLACK_API_TOKEN;
  const   slackChannelName = process.env.SLACK_CHANNEL_NAME;
  const   tableName = process.env.TABLE_NAME;
  const   option = parseInt(""+process.env.INVOICE_MONTH+process.env.INVOICE_DAY+process.env.DIFF_PERDAY+process.env.DIFF_INCREASE_AMOUNT_YESTERDAY,2);
　//slack用テキスト生成
  const createMessage = function( billing_data, date ) {
   let msgs = [""];
   let msg = "";
   let description = "";
   let cost = "";
   let diff = "";
   let sum = 0;

   msg += `\n`;
   msg += `< ${date.min_day} - ${date.max_day} > Invoice ${date.invoice_month.substr(0,4)}/${date.invoice_month.substr(4,2)}`;
   if((option&parseInt("0010",2))>0) msg += ` ( ${date.max_day} 00:00-24:00 )`;
   if((option&parseInt("0001",2))>0) msg += ` ( ${date.max_day} 前日費差分 )`;
    let today_cost = 0;
    let total_today_cost = 0;
    let month_cost = 0;
    if((option&parseInt("1000",2))>0) {
      Object.keys(billing_data[0]).forEach( pj_name=>{
       //プロジェクトに依存しない請求はproject.idがnullになる
       // sum 1 day billing

         today_cost = 0;
         diff_cost = 0;
         if(billing_data[1][pj_name]) billing_data[1][pj_name].forEach( v => {today_cost+=v.cost; diff_cost+=v.diff_cost;} );

         total_today_cost += today_cost;
         // sum month billing
         month_cost = 0;
         if(billing_data[0][pj_name]) billing_data[0][pj_name].forEach( v => month_cost+=v.cost );
         diff_cost = Math.round(diff_cost * 100) / 100;
         diff = diff_cost > 0 ? `${diff_cost}`+"↑" : (diff_cost == 0 ? `0`+"→" : `${-1*diff_cost}`+"↓");
         diff = spacer(diff, 10,true);

         msg += createMessageRow(pj_name == "null"?"Support":pj_name, month_cost);
         if((option&parseInt("0010",2))>0) msg += " ("+spacer(`${Math.round(today_cost)}↑`,10,true)+")";
         if((option&parseInt("0001",2))>0) msg += ` (${diff})`;
         sum += Number(month_cost);
       });
       msg += "\n―――――――――――――――――――――――――――";
       msg += createMessageRow("Sum",sum);
       msg += " ("+spacer(`${Math.round(total_today_cost*100)/100}↑`,10,true)+")";
       msg += "\n\n";
     }
     msgs = pushMsgs(msgs,msg);
     msg = "";
     // breakdown
     if( (option&parseInt("0100",2))>0 )
     Object.keys(billing_data[0]).forEach( pj_name=>{
       msg += `< ${date.min_day} - ${date.max_day} > ${pj_name == "null"?"Support":pj_name}`;
       msg += `\n${spacer(`service name`, 22, false)}|${spacer('this month', 11,true)}`;
       if((option&parseInt("0010",2))>0)msg += ` (${spacer('one day', 10,true)})`;
       if((option&parseInt("0001",2))>0)msg += ` (${spacer('diff day', 10,true)})`;
       msg += `\n-----------------------------------------------`;
       billing_data[0][pj_name].forEach((v,i)=>{
         if(  Object.keys(billing_data[1]).indexOf(pj_name)>=0 && (d = findDupDescription( billing_data[1][pj_name], v.service_description )) )
          {
             diff = d.diff_cost > 0 ? `${d.diff_cost}`+"↑" : (d.diff_cost == 0 ? `0`+"→" : `${-1*d.diff_cost}`+"↓");
             diff = spacer(diff, 10,true);
             cost = spacer(`${Math.ceil(Number(d.cost))}↑`, 10,true);
             msg += createMessageRow(v.service_description,v.cost);
             if((option&parseInt("0010",2))>0) msg += ` (${cost})`;
             if((option&parseInt("0001",2))>0) msg += ` (${diff})`;
          }
          else
          {
            msg += createMessageRow(v.service_description,v.cost)
            if((option&parseInt("0010",2))>0) msg +=` (${spacer("0→",10,true)})`;
            if((option&parseInt("0001",2))>0) msg +=` (${spacer("0→",10,true)})`;
          }
       });
       msg += "\n\n";
       msgs = pushMsgs(msgs,msg);
       msg = "";
     });
     msgs = decolateMsgs(fmtMsgs(msgs,date.max_day));
     return msgs;
}


 const pushMsgs = function(msgs, msg) {
   const max_msg_length = 4000;
   if ( (msgs[msgs.length-1]+msg).length <= max_msg_length )
    msgs[msgs.length-1] += msg;
   else
    msgs.push(msg);
   return msgs;
 }

 const fmtMsgs = function(msgs,ex_day){
   if(msgs.length == 1) return msgs;
   const holizon_msg = (e,n,d)=>{return `${e} 投稿コメント (${n}/${d})\nSlack文字数の上限に達したことで投稿が分割されました。\n\n`};
   msgs[0] = msgs[0]+`\n文字数が上限に達したので投稿を分割します\n${ex_day} 投稿コメント (1/${msgs.length})\n`;
   msgs.forEach((v,i)=>{ if(i>0) msgs[i] = holizon_msg(ex_day,i+1,msgs.length)+v; });
   return msgs;
 }

 const decolateMsgs = function(msgs){
   msgs.forEach((m,i)=>{msgs[i]="```\n"+m+"\n```";});
   return msgs;
 }


 const findDupDescription = function( descriptions, description ) {
   var d = undefined;
   descriptions.forEach(v=>{
     if (v.service_description == description) d = v;
   });
  return d;
 };

 //slackにテキストを送信する
 const sendMessage = function( token, ch_name, msg ) {
   return new Promise(function(res,rej){
     let https       = require('https');
     let querystring = require("querystring")
     let data = querystring.stringify({
       token:   token,
       channel: ch_name,
       text:    msg
     });
     let options = {
       host:'slack.com',
       port:443,
       method:'POST',
       path:'/api/chat.postMessage',
       headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
         'Content-Length': data.length
       }
     }
     let req = https.request(options,r=>{
       r.on('data', chunk=>{});
       r.on('end',  ()=>{ res(); });
       r.on('error', err=>{ console.log(err); rej(); });
     });
     req.write(data);
     req.end();
   });
 }

 //概要と価格を良しなにつなげてくれる
 const createMessageRow = function(description, cost){
   d = spacer(description, 22, false);
   c = spacer(`${Math.ceil(cost)}円`,10,true);
   return `\n${d}|${c}`;
 }

//文字列の右か左をスペースで埋める
 const spacer = function(str,numofspace,is_Left)
 {
   let result = str;
   if(is_Left)for( let i=0; i<numofspace - str.length; i++ )
      result = " "+result;
   else for( let i=0; i<numofspace - str.length; i++ )
      result = result+" ";
   return result;
 }

//とってきたデータを変形させる
 const reshapeData= function(values){
   let res = [];
   for (let i=0; i<2; i++)
   {
    res[i] = {};
    values[i].forEach( v => {
      if(Object.keys(res[i]).indexOf(v.pj_name)<0) res[i][v.pj_name] = [];
      res[i][v.pj_name].push(v);
    });
   }
   return res;
 }

 const getMinMaxDay = function(v){
     let min_day = v[0].min_day;
     let max_day = v[0].max_day;
     v.forEach(b=>{
       min_day = new Date(b.min_day).getTime() < new Date(min_day).getTime() ? b.min_day : min_day;
       max_day = new Date(b.max_day).getTime() > new Date(max_day).getTime() ? b.max_day : max_day;
     });
     return { min_day:min_day, max_day:max_day, invoice_month:v[0].invoice_month };
 }


 //ここから実行
 const {BigQuery} = require('@google-cloud/bigquery');
 const bq = new BigQuery({projectId: process.env.GCP_PROJECT});
 // 今日の請求額と一緒に前日の差額をとってくる
 const sql_today = {
   query: "\
   SELECT\
    T.pj_name,\
    T.sdict AS service_description,\
    T.cost AS cost,\
    ROUND(T.cost-Y.cost,2) AS diff_cost\
   FROM\
     (SELECT project.id AS pj_name, service.description AS sdict, SUM(cost) AS cost\
     FROM `"+tableName+"`\
     WHERE FORMAT_DATE('%Y-%m-%d',DATE_SUB(CURRENT_DATE() ,INTERVAL 1 DAY)) = FORMAT_DATE('%Y-%m-%d', DATE(export_time)) \
     GROUP BY project.id, service.description\
     ORDER BY project.id, service.description\
     LIMIT 100) T\
     INNER JOIN\
     (SELECT project.id AS pj_name, service.description AS sdict,SUM(cost) AS cost \
     FROM `"+tableName+"`\
     WHERE FORMAT_DATE('%Y-%m-%d',DATE_SUB(CURRENT_DATE() ,INTERVAL 2 DAY)) = FORMAT_DATE('%Y-%m-%d', DATE(export_time)) \
     GROUP BY project.id, service.description\
     ORDER BY project.id, service.description\
     LIMIT 100) Y\
    ON T.pj_name = Y.pj_name AND T.sdict = Y.sdict\
    WHERE T.cost > 0 OR Y.cost > 0;"};
//今月請求分の合計をとってくる
 const sql_month = {
   query: "\
   SELECT\
    project.id AS pj_name,\
    service.description AS service_description,\
    CEIL(SUM(cost)) AS cost,\
    FORMAT_DATE('%m/%d',\
    MIN(DATE(export_time))) AS min_day,\
    FORMAT_DATE('%m/%d',MAX(DATE(export_time))) AS max_day,\
    MAX(invoice.month) AS invoice_month,\
    FORMAT_DATE('%m/%d',DATE_SUB(CURRENT_DATE() ,INTERVAL 1 DAY)) AS ex_day\
   FROM  `"+tableName+"`\
   WHERE cost > 0\
   AND invoice.month=(SELECT MAX(invoice.month) FROM `"+tableName+"`)\
   GROUP BY project.id, service.description\
   ORDER BY project.id, service.description\
   LIMIT 50"};
if((option&parseInt("1100",2))>0)
{
  let today = new Promise((res,rej)=>bq.query(sql_today).then(results => res(results[0])));
  let month = new Promise((res,rej)=>bq.query(sql_month).then(results => res(results[0])));
  Promise.all([month,today]).then(values=>{
    let rvalues = reshapeData(values);
    let minmaxday = getMinMaxDay(values[0]);
    let res = createMessage(rvalues,minmaxday);
    var funcArray = [];
    res.forEach( m=> funcArray.push(()=>{return sendMessage(slackAPIToken,slackChannelName,m)}) );
    funcArray.reduce((pv,cv)=>{return pv.then(cv);}, Promise.resolve());
  });
}
response.status(200).end();
}
