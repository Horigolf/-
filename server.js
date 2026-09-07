const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));

let players = {};
let currentQuestion = null;
let hostSocketId = null;
let phase = 'lobby';
let round = 0;
let usedQuestionIds = new Set();

const questions = {
  party: [
    { id:'party-1', question:'日本で施設数が多いのは？', choiceA:'コンビニ', choiceB:'歯科診療所', correctAnswer:'B', difficulty:2, explanation:'歯科診療所は全国で約6万施設あり、コンビニ店舗数を上回る。' },
    { id:'party-2', question:'1円玉1枚の重さは？', choiceA:'1g', choiceB:'2g', correctAnswer:'A', difficulty:1, explanation:'1円硬貨はちょうど1g。' },
    { id:'party-3', question:'一般的なサイコロで向かい合う面の合計は？', choiceA:'7', choiceB:'8', correctAnswer:'A', difficulty:1, explanation:'1と6、2と5、3と4が向かい合い、合計はすべて7。' },
    { id:'party-4', question:'先に発売されたのは？', choiceA:'ファミコン', choiceB:'ゲームボーイ', correctAnswer:'A', difficulty:1, explanation:'ファミコンは1983年、ゲームボーイは1989年。' },
    { id:'party-5', question:'成人の骨の数は一般に？', choiceA:'約206個', choiceB:'約306個', correctAnswer:'A', difficulty:2, explanation:'成人の骨は一般に206個とされる。' },
    { id:'party-6', question:'トランプ1組（ジョーカー除く）は？', choiceA:'52枚', choiceB:'54枚', correctAnswer:'A', difficulty:1, explanation:'13枚×4スートで52枚。' }
  ],
  close: [
    { id:'close-1', question:'富士山の高さに近いのは？', choiceA:'3,776m', choiceB:'3,676m', correctAnswer:'A', difficulty:2, explanation:'富士山の標高は3,776m。' },
    { id:'close-2', question:'地球の直径に近いのは？', choiceA:'約12,742km', choiceB:'約13,742km', correctAnswer:'A', difficulty:2, explanation:'地球の平均直径は約12,742km。' },
    { id:'close-3', question:'1日は何秒？', choiceA:'86,400秒', choiceB:'84,600秒', correctAnswer:'A', difficulty:2, explanation:'24×60×60で86,400秒。' },
    { id:'close-4', question:'1年は平年で何時間？', choiceA:'8,760時間', choiceB:'8,670時間', correctAnswer:'A', difficulty:2, explanation:'365×24で8,760時間。' },
    { id:'close-5', question:'フルマラソンの距離は？', choiceA:'42.195km', choiceB:'42.915km', correctAnswer:'A', difficulty:2, explanation:'正式距離は42.195km。' },
    { id:'close-6', question:'100円玉の直径に近いのは？', choiceA:'22.6mm', choiceB:'26.2mm', correctAnswer:'A', difficulty:3, explanation:'100円硬貨の直径は22.6mm。' }
  ],
  trick: [
    { id:'trick-1', question:'日本の47都道府県。「県」はいくつ？', choiceA:'43', choiceB:'44', correctAnswer:'A', difficulty:2, explanation:'1都1道2府43県で合計47。' },
    { id:'trick-2', question:'0は偶数？', choiceA:'偶数', choiceB:'偶数ではない', correctAnswer:'A', difficulty:2, explanation:'0は2で割り切れるので偶数。' },
    { id:'trick-3', question:'北極と南極、平均的に標高が高いのは？', choiceA:'南極', choiceB:'北極', correctAnswer:'A', difficulty:3, explanation:'南極は大陸上の厚い氷床。北極は主に海氷。' },
    { id:'trick-4', question:'世界最大の砂漠は？', choiceA:'南極', choiceB:'サハラ砂漠', correctAnswer:'A', difficulty:3, explanation:'降水量基準では南極が世界最大の砂漠。' },
    { id:'trick-5', question:'ペンギンが野生で暮らすのは？', choiceA:'南半球中心', choiceB:'北極中心', correctAnswer:'A', difficulty:1, explanation:'野生のペンギンは南半球を中心に分布する。' },
    { id:'trick-6', question:'トマトは植物学上どちら？', choiceA:'果実', choiceB:'根菜', correctAnswer:'A', difficulty:1, explanation:'花の子房からできるため植物学上は果実。' }
  ],
  japan: [
    { id:'japan-1', question:'面積が大きいのは？', choiceA:'北海道', choiceB:'九州', correctAnswer:'A', difficulty:1, explanation:'北海道は約8.3万km²で九州より大きい。' },
    { id:'japan-2', question:'標高が高いのは？', choiceA:'富士山', choiceB:'北岳', correctAnswer:'A', difficulty:1, explanation:'富士山3,776m、北岳3,193m。' },
    { id:'japan-3', question:'東にあるのは？', choiceA:'東京', choiceB:'札幌', correctAnswer:'A', difficulty:2, explanation:'札幌は東京より北だが、経度は東京の方が東。' },
    { id:'japan-4', question:'日本で一番長い川は？', choiceA:'信濃川', choiceB:'利根川', correctAnswer:'A', difficulty:1, explanation:'信濃川は367kmで日本最長。' },
    { id:'japan-5', question:'日本で一番大きい湖は？', choiceA:'琵琶湖', choiceB:'霞ヶ浦', correctAnswer:'A', difficulty:1, explanation:'琵琶湖が日本最大。' },
    { id:'japan-6', question:'先に開業した新幹線区間は？', choiceA:'東京〜新大阪', choiceB:'新大阪〜岡山', correctAnswer:'A', difficulty:1, explanation:'東海道新幹線は1964年、新大阪〜岡山は1972年。' }
  ],
  world: [
    { id:'world-1', question:'面積が大きいのは？', choiceA:'オーストラリア', choiceB:'インド', correctAnswer:'A', difficulty:1, explanation:'オーストラリアは約769万km²、インドは約329万km²。' },
    { id:'world-2', question:'面積が大きいのは？', choiceA:'メキシコ', choiceB:'南アフリカ', correctAnswer:'A', difficulty:2, explanation:'メキシコは約196万km²、南アフリカは約122万km²。' },
    { id:'world-3', question:'人口が多いのは？', choiceA:'インド', choiceB:'中国', correctAnswer:'A', difficulty:1, explanation:'インドは2023年に中国を抜き世界最多人口となった。' },
    { id:'world-4', question:'赤道が通るのは？', choiceA:'エクアドル', choiceB:'チリ', correctAnswer:'A', difficulty:1, explanation:'エクアドルには赤道が通る。' },
    { id:'world-5', question:'首都が北にあるのは？', choiceA:'ロンドン', choiceB:'パリ', correctAnswer:'A', difficulty:1, explanation:'ロンドンは北緯約51.5度、パリは約48.9度。' },
    { id:'world-6', question:'国土面積が大きいのは？', choiceA:'ブラジル', choiceB:'オーストラリア', correctAnswer:'A', difficulty:2, explanation:'ブラジルの方がやや大きい。' }
  ],
  food: [
    { id:'food-1', question:'一般に同量ならカフェインが多いのは？', choiceA:'ドリップコーヒー', choiceB:'緑茶', correctAnswer:'A', difficulty:1, explanation:'抽出条件で変わるが、一般的な比較ではコーヒーが多い。' },
    { id:'food-2', question:'世界三大料理に数えられるのは？', choiceA:'トルコ料理', choiceB:'イタリア料理', correctAnswer:'A', difficulty:2, explanation:'一般にフランス・中国・トルコ料理が世界三大料理と呼ばれる。' },
    { id:'food-3', question:'主原料が米なのは？', choiceA:'日本酒', choiceB:'ウイスキー', correctAnswer:'A', difficulty:1, explanation:'日本酒は米、米麹、水が主原料。' },
    { id:'food-4', question:'カカオ豆から作られるのは？', choiceA:'チョコレート', choiceB:'キャラメル', correctAnswer:'A', difficulty:1, explanation:'チョコレートの主原料はカカオ豆。' },
    { id:'food-5', question:'一般にアルコール度数が高いのは？', choiceA:'ワイン', choiceB:'ビール', correctAnswer:'A', difficulty:1, explanation:'一般的にワインはビールより度数が高い。' },
    { id:'food-6', question:'辛味成分カプサイシンを含むのは？', choiceA:'唐辛子', choiceB:'わさび', correctAnswer:'A', difficulty:1, explanation:'唐辛子の代表的な辛味成分がカプサイシン。' }
  ],
  sports: [
    { id:'sports-1', question:'サッカーの1チーム、ピッチ上の人数は？', choiceA:'11人', choiceB:'12人', correctAnswer:'A', difficulty:1, explanation:'ゴールキーパーを含め11人。' },
    { id:'sports-2', question:'バスケの1チーム、コート上の人数は？', choiceA:'5人', choiceB:'6人', correctAnswer:'A', difficulty:1, explanation:'コート上は1チーム5人。' },
    { id:'sports-3', question:'ゴルフで規定打数より1打少ないのは？', choiceA:'バーディー', choiceB:'イーグル', correctAnswer:'A', difficulty:1, explanation:'バーディーは1打少ない、イーグルは2打少ない。' },
    { id:'sports-4', question:'テニスで40-40を何という？', choiceA:'デュース', choiceB:'タイブレーク', correctAnswer:'A', difficulty:1, explanation:'40-40はデュース。' },
    { id:'sports-5', question:'ボウリングは基本何フレーム？', choiceA:'10', choiceB:'12', correctAnswer:'A', difficulty:1, explanation:'1ゲームは10フレーム。' },
    { id:'sports-6', question:'野球で三振に必要なストライク数は？', choiceA:'3', choiceB:'4', correctAnswer:'A', difficulty:1, explanation:'3ストライクで三振。' }
  ],
  darts: [
    { id:'darts-1', question:'ダーツ3投の最高得点は？', choiceA:'180点', choiceB:'177点', correctAnswer:'A', difficulty:1, explanation:'トリプル20を3本で180点。' },
    { id:'darts-2', question:'ブルの中心「ダブルブル」は？', choiceA:'50点', choiceB:'25点', correctAnswer:'A', difficulty:1, explanation:'一般的なソフト/スティールのセパレートブルでは中心は50点。' },
    { id:'darts-3', question:'T20の得点は？', choiceA:'60点', choiceB:'40点', correctAnswer:'A', difficulty:1, explanation:'20のトリプルなので60点。' },
    { id:'darts-4', question:'01で「ハットトリック」は一般に？', choiceA:'3本すべてブル', choiceB:'3本すべてT20', correctAnswer:'A', difficulty:2, explanation:'3本ともブルに入れることをハットトリックと呼ぶ。' },
    { id:'darts-5', question:'クリケットのナンバーに含まれるのは？', choiceA:'15', choiceB:'14', correctAnswer:'A', difficulty:1, explanation:'標準クリケットは15〜20とブル。' },
    { id:'darts-6', question:'D20の得点は？', choiceA:'40点', choiceB:'20点', correctAnswer:'A', difficulty:1, explanation:'20のダブルなので40点。' }
  ],
  adult: [
    { id:'adult-1', question:'一般的な名刺の受け渡しで上に向けるのは？', choiceA:'相手が読める向き', choiceB:'自分が読める向き', correctAnswer:'A', difficulty:1, explanation:'相手から読める向きで差し出すのが基本。' },
    { id:'adult-2', question:'「御中」を使う相手は？', choiceA:'会社・部署', choiceB:'個人名', correctAnswer:'A', difficulty:1, explanation:'会社や部署には御中、個人には様を使う。' },
    { id:'adult-3', question:'日本の成人年齢は？', choiceA:'18歳', choiceB:'20歳', correctAnswer:'A', difficulty:1, explanation:'2022年4月から成人年齢は18歳。' },
    { id:'adult-4', question:'クーリングオフはすべての買い物に使える？', choiceA:'使えない', choiceB:'使える', correctAnswer:'A', difficulty:2, explanation:'対象となる取引類型や条件が決められている。' },
    { id:'adult-5', question:'「税込1,100円」。消費税10%なら税抜は？', choiceA:'1,000円', choiceB:'990円', correctAnswer:'A', difficulty:1, explanation:'1,000円×1.10＝1,100円。' },
    { id:'adult-6', question:'銀行の普通預金。一般に利息へかかる税は？', choiceA:'かかる', choiceB:'かからない', correctAnswer:'A', difficulty:2, explanation:'預金利息には原則として税金が源泉徴収される。' }
  ]
};

const genreLabels = {
  party:'盛り上がり雑学', close:'ギリギリ雑学', trick:'ひっかけ', japan:'日本', world:'世界', food:'食べ物・飲み物', sports:'スポーツ', darts:'ダーツ', adult:'大人の常識'
};

function alivePlayers(){ return Object.values(players).filter(p=>p.status==='alive'); }
function publicPlayers(){
  const result={};
  for(const [id,p] of Object.entries(players)) result[id]={name:p.name,status:p.status,progress:p.progress,answered:Boolean(p.choice),choice:p.choice};
  return result;
}
function gameSnapshot(){
  return {phase,round,currentQuestion:currentQuestion?{id:currentQuestion.id,question:currentQuestion.question,choiceA:currentQuestion.choiceA,choiceB:currentQuestion.choiceB,difficulty:currentQuestion.difficulty,genre:currentQuestion.genre}:null,playerCount:Object.keys(players).length,aliveCount:alivePlayers().length};
}
function emitState(){ io.emit('gameState',gameSnapshot()); io.emit('update',publicPlayers()); }
function requireHost(socket,fn){ if(socket.id===hostSocketId) fn(); }
function pickRandomQuestion(genre='party'){
  const pool=questions[genre]||questions.party;
  let available=pool.filter(q=>!usedQuestionIds.has(q.id));
  if(!available.length){ pool.forEach(q=>usedQuestionIds.delete(q.id)); available=[...pool]; }
  return available[Math.floor(Math.random()*available.length)];
}

io.on('connection',socket=>{
  socket.emit('genres',genreLabels); socket.emit('gameState',gameSnapshot()); socket.emit('update',publicPlayers());

  socket.on('registerHost',()=>{
    if(!hostSocketId||hostSocketId===socket.id){ hostSocketId=socket.id; socket.emit('hostGranted',true); socket.emit('genres',genreLabels); }
    else socket.emit('hostGranted',false);
  });

  socket.on('join',rawName=>{
    const name=String(rawName||'').trim().slice(0,12); if(!name)return;
    const existing=players[socket.id];
    players[socket.id]={name,choice:null,status:existing?.status||'alive',progress:existing?.progress||0};
    socket.emit('joined',{name}); emitState();
  });

  socket.on('choose',choice=>{
    const player=players[socket.id];
    if(!player||player.status!=='alive'||phase!=='question'||!['A','B'].includes(choice))return;
    player.choice=choice; socket.emit('choiceAccepted',choice); emitState();
  });

  socket.on('getQuestions',genre=>requireHost(socket,()=>{
    const list=(questions[genre]||[]).map(({correctAnswer,explanation,...q},index)=>({...q,index}));
    socket.emit('questionsList',{genre,questions:list});
  }));

  function startQuestion(q,genre){
    if(!q)return; currentQuestion={...q,genre}; usedQuestionIds.add(q.id); round+=1; phase='question';
    Object.values(players).forEach(p=>p.choice=null); io.emit('question',gameSnapshot().currentQuestion); emitState();
  }
  socket.on('startRandom',genre=>requireHost(socket,()=>startQuestion(pickRandomQuestion(genre),genre)));
  socket.on('loadQuestion',(index,genre)=>requireHost(socket,()=>startQuestion((questions[genre]||[])[index],genre)));

  socket.on('revealAnswer',()=>requireHost(socket,()=>{
    if(!currentQuestion||phase!=='question')return;
    const correct=currentQuestion.correctAnswer;
    Object.values(players).forEach(p=>{ if(p.status!=='alive')return; if(p.choice===correct)p.progress+=1; else p.status='dead'; });
    phase=alivePlayers().length<=1&&Object.keys(players).length>1?'finished':'result';
    io.emit('showAnswer',{correct,explanation:currentQuestion.explanation,choiceA:currentQuestion.choiceA,choiceB:currentQuestion.choiceB,winner:phase==='finished'&&alivePlayers()[0]?alivePlayers()[0].name:null});
    emitState();
  }));

  socket.on('next',()=>requireHost(socket,()=>{
    currentQuestion=null; if(phase!=='finished')phase='lobby'; Object.values(players).forEach(p=>p.choice=null); io.emit('clear-question'); emitState();
  }));

  socket.on('resetGame',()=>requireHost(socket,()=>{
    currentQuestion=null; phase='lobby'; round=0; usedQuestionIds.clear();
    Object.values(players).forEach(p=>{p.choice=null;p.status='alive';p.progress=0});
    io.emit('gameReset'); io.emit('clear-question'); emitState();
  }));

  socket.on('disconnect',()=>{ if(socket.id===hostSocketId)hostSocketId=null; if(players[socket.id])delete players[socket.id]; emitState(); });
});

const port=process.env.PORT||3000;
server.listen(port,()=>console.log(`二択サバイバル起動中: port ${port}`));
