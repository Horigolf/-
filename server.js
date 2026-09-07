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
let phase = 'lobby'; // lobby | question | result | finished
let round = 0;
let usedQuestionIds = new Set();

const questions = {
  party: [
    { id: 'party-1', question: '日本で店舗数が多いのは？', choiceA: 'コンビニ', choiceB: '歯科診療所', correctAnswer: 'B', difficulty: 2, explanation: '歯科診療所は全国に約6万台、コンビニは約5万台。意外と歯医者の方が多い。' },
    { id: 'party-2', question: '1円玉1枚の重さは？', choiceA: '1g', choiceB: '2g', correctAnswer: 'A', difficulty: 1, explanation: '1円硬貨はちょうど1g。' },
    { id: 'party-3', question: '一般的なサイコロで向かい合う面の合計は？', choiceA: '7', choiceB: '8', correctAnswer: 'A', difficulty: 1, explanation: '1と6、2と5、3と4が向かい合い、すべて合計7。' },
    { id: 'party-4', question: '先に発売されたのは？', choiceA: 'ファミコン', choiceB: 'ゲームボーイ', correctAnswer: 'A', difficulty: 1, explanation: 'ファミコンは1983年、ゲームボーイは1989年。' },
    { id: 'party-5', question: 'オリンピックの五輪マークの輪の数は？', choiceA: '5', choiceB: '6', correctAnswer: 'A', difficulty: 1, explanation: '五大陸の結合を象徴する5つの輪。' },
    { id: 'party-6', question: 'トランプ1組（ジョーカー除く）は何枚？', choiceA: '52枚', choiceB: '54枚', correctAnswer: 'A', difficulty: 1, explanation: '13枚×4スートで52枚。' },
    { id: 'party-7', question: '地球上で最も面積が大きい国は？', choiceA: 'ロシア', choiceB: 'カナダ', correctAnswer: 'A', difficulty: 1, explanation: 'ロシアが世界最大、カナダが2位。' },
    { id: 'party-8', question: '成人の骨の数は一般に？', choiceA: '約206個', choiceB: '約306個', correctAnswer: 'A', difficulty: 2, explanation: '成人の骨は一般に206個とされる。' }
  ],
  japan: [
    { id: 'japan-1', question: '面積が大きいのは？', choiceA: '北海道', choiceB: '九州', correctAnswer: 'A', difficulty: 1, explanation: '北海道は約8.3万km²、九州は約3.7万km²。' },
    { id: 'japan-2', question: '人口が多いのは？', choiceA: '福岡県', choiceB: '北海道', correctAnswer: 'A', difficulty: 2, explanation: '近年は福岡県の人口が北海道を上回っている。' },
    { id: 'japan-3', question: '標高が高いのは？', choiceA: '富士山', choiceB: '北岳', correctAnswer: 'A', difficulty: 1, explanation: '富士山3,776m、北岳3,193m。' },
    { id: 'japan-4', question: '東にあるのは？', choiceA: '東京', choiceB: '札幌', correctAnswer: 'A', difficulty: 2, explanation: '経度は東京の方が東。札幌は東京より北だが、やや西にある。' },
    { id: 'japan-5', question: '日本で一番長い川は？', choiceA: '信濃川', choiceB: '利根川', correctAnswer: 'A', difficulty: 1, explanation: '信濃川は367kmで日本最長。' },
    { id: 'japan-6', question: '日本で一番大きい湖は？', choiceA: '琵琶湖', choiceB: '霞ヶ浦', correctAnswer: 'A', difficulty: 1, explanation: '琵琶湖が日本最大の湖。' },
    { id: 'japan-7', question: '新幹線が先に開業した区間は？', choiceA: '東京〜新大阪', choiceB: '新大阪〜岡山', correctAnswer: 'A', difficulty: 1, explanation: '東海道新幹線は1964年、山陽新幹線の新大阪〜岡山は1972年。' },
    { id: 'japan-8', question: '県名と県庁所在地名が同じなのは？', choiceA: '福岡県', choiceB: '愛媛県', correctAnswer: 'A', difficulty: 1, explanation: '福岡県の県庁所在地は福岡市。愛媛県は松山市。' }
  ],
  world: [
    { id: 'world-1', question: '面積が大きいのは？', choiceA: 'オーストラリア', choiceB: 'インド', correctAnswer: 'A', difficulty: 1, explanation: 'オーストラリアは約769万km²、インドは約329万km²。' },
    { id: 'world-2', question: '面積が大きいのは？', choiceA: 'メキシコ', choiceB: '南アフリカ', correctAnswer: 'A', difficulty: 2, explanation: 'メキシコは約196万km²、南アフリカは約122万km²。' },
    { id: 'world-3', question: '人口が多いのは？', choiceA: 'インド', choiceB: '中国', correctAnswer: 'A', difficulty: 1, explanation: 'インドは2023年に中国を抜き、世界最多人口となった。' },
    { id: 'world-4', question: '赤道が通るのは？', choiceA: 'エクアドル', choiceB: 'チリ', correctAnswer: 'A', difficulty: 1, explanation: '国名エクアドルはスペイン語で「赤道」の意味。' },
    { id: 'world-5', question: '首都が北にあるのは？', choiceA: 'ロンドン', choiceB: 'パリ', correctAnswer: 'A', difficulty: 1, explanation: 'ロンドンは北緯約51.5度、パリは約48.9度。' },
    { id: 'world-6', question: '国土面積が大きいのは？', choiceA: 'ブラジル', choiceB: 'オーストラリア', correctAnswer: 'A', difficulty: 2, explanation: 'ブラジルは約851万km²、オーストラリアは約769万km²。' },
    { id: 'world-7', question: '先に独立したのは？', choiceA: 'アメリカ', choiceB: 'インド', correctAnswer: 'A', difficulty: 1, explanation: 'アメリカ独立宣言は1776年、インド独立は1947年。' },
    { id: 'world-8', question: '公用語としてスペイン語が使われるのは？', choiceA: 'メキシコ', choiceB: 'ブラジル', correctAnswer: 'A', difficulty: 1, explanation: 'メキシコではスペイン語が広く使われ、ブラジルはポルトガル語。' }
  ],
  food: [
    { id: 'food-1', question: '一般にカフェインが多いのは同量なら？', choiceA: 'ドリップコーヒー', choiceB: '緑茶', correctAnswer: 'A', difficulty: 1, explanation: '抽出条件で変わるが、一般的な同量比較ではコーヒーの方が多い。' },
    { id: 'food-2', question: '「世界三大料理」に数えられるのは？', choiceA: 'トルコ料理', choiceB: 'イタリア料理', correctAnswer: 'A', difficulty: 2, explanation: '一般にフランス・中国・トルコ料理が世界三大料理と呼ばれる。' },
    { id: 'food-3', question: '原料が米なのは？', choiceA: '日本酒', choiceB: 'ウイスキー', correctAnswer: 'A', difficulty: 1, explanation: '日本酒は米、米麹、水が主原料。' },
    { id: 'food-4', question: '「カカオ豆」から作られるのは？', choiceA: 'チョコレート', choiceB: 'キャラメル', correctAnswer: 'A', difficulty: 1, explanation: 'チョコレートの主原料はカカオ豆。' },
    { id: 'food-5', question: '一般にアルコール度数が高いのは？', choiceA: 'ワイン', choiceB: 'ビール', correctAnswer: 'A', difficulty: 1, explanation: '一般的にワインは12%前後、ビールは5%前後。' },
    { id: 'food-6', question: '「もり」と「ざる」、一般に海苔が付くのは？', choiceA: 'ざるそば', choiceB: 'もりそば', correctAnswer: 'A', difficulty: 1, explanation: '現在は刻み海苔の有無で区別されることが多い。' },
    { id: 'food-7', question: '主に大豆から作るのは？', choiceA: '豆腐', choiceB: 'こんにゃく', correctAnswer: 'A', difficulty: 1, explanation: '豆腐は大豆、こんにゃくはこんにゃく芋が主原料。' },
    { id: 'food-8', question: '一般に辛味成分カプサイシンを含むのは？', choiceA: '唐辛子', choiceB: 'わさび', correctAnswer: 'A', difficulty: 1, explanation: '唐辛子の辛味はカプサイシン。わさびの辛味成分は主にアリルイソチオシアネート。' }
  ],
  sports: [
    { id: 'sports-1', question: 'サッカーの1チーム、ピッチ上の人数は？', choiceA: '11人', choiceB: '12人', correctAnswer: 'A', difficulty: 1, explanation: 'ゴールキーパーを含めて11人。' },
    { id: 'sports-2', question: 'バスケットボールの1チーム、コート上の人数は？', choiceA: '5人', choiceB: '6人', correctAnswer: 'A', difficulty: 1, explanation: 'コート上は1チーム5人。' },
    { id: 'sports-3', question: '野球で三振に必要なストライク数は？', choiceA: '3', choiceB: '4', correctAnswer: 'A', difficulty: 1, explanation: '3ストライクで三振。' },
    { id: 'sports-4', question: 'ゴルフで規定打数より1打少ないのは？', choiceA: 'バーディー', choiceB: 'イーグル', correctAnswer: 'A', difficulty: 1, explanation: 'バーディーは1打少ない、イーグルは2打少ない。' },
    { id: 'sports-5', question: 'ダーツの01で最高得点となる3投は？', choiceA: '180点', choiceB: '200点', correctAnswer: 'A', difficulty: 1, explanation: 'トリプル20を3本で180点。' },
    { id: 'sports-6', question: 'テニスで40-40を何という？', choiceA: 'デュース', choiceB: 'タイブレーク', correctAnswer: 'A', difficulty: 1, explanation: '40-40はデュース。' },
    { id: 'sports-7', question: 'マラソンの正式距離は？', choiceA: '42.195km', choiceB: '40.195km', correctAnswer: 'A', difficulty: 1, explanation: 'フルマラソンは42.195km。' },
    { id: 'sports-8', question: 'ボウリングの1ゲームで投げる基本フレーム数は？', choiceA: '10', choiceB: '12', correctAnswer: 'A', difficulty: 1, explanation: '1ゲームは10フレーム。' }
  ]
};

const genreLabels = {
  party: '盛り上がり雑学',
  japan: '日本',
  world: '世界',
  food: '食べ物・飲み物',
  sports: 'スポーツ'
};

function alivePlayers() {
  return Object.values(players).filter((p) => p.status === 'alive');
}

function publicPlayers(revealChoices = false) {
  const result = {};
  for (const [id, p] of Object.entries(players)) {
    result[id] = {
      name: p.name,
      status: p.status,
      progress: p.progress,
      answered: Boolean(p.choice),
      choice: revealChoices ? p.choice : null
    };
  }
  return result;
}

function gameSnapshot() {
  return {
    phase,
    round,
    currentQuestion: currentQuestion ? {
      id: currentQuestion.id,
      question: currentQuestion.question,
      choiceA: currentQuestion.choiceA,
      choiceB: currentQuestion.choiceB,
      difficulty: currentQuestion.difficulty,
      genre: currentQuestion.genre
    } : null,
    playerCount: Object.keys(players).length,
    aliveCount: alivePlayers().length
  };
}

function emitState() {
  io.emit('gameState', gameSnapshot());
  io.emit('update', publicPlayers(phase === 'result' || phase === 'finished'));
}

function requireHost(socket, fn) {
  if (socket.id === hostSocketId) fn();
}

function pickRandomQuestion(genre = 'party') {
  const pool = questions[genre] || questions.party;
  let available = pool.filter((q) => !usedQuestionIds.has(q.id));
  if (!available.length) {
    pool.forEach((q) => usedQuestionIds.delete(q.id));
    available = [...pool];
  }
  return available[Math.floor(Math.random() * available.length)];
}

io.on('connection', (socket) => {
  socket.emit('genres', genreLabels);
  socket.emit('gameState', gameSnapshot());
  socket.emit('update', publicPlayers(phase === 'result' || phase === 'finished'));

  socket.on('registerHost', () => {
    if (!hostSocketId || hostSocketId === socket.id) {
      hostSocketId = socket.id;
      socket.emit('hostGranted', true);
      socket.emit('genres', genreLabels);
    } else {
      socket.emit('hostGranted', false);
    }
  });

  socket.on('join', (rawName) => {
    const name = String(rawName || '').trim().slice(0, 12);
    if (!name) return;
    players[socket.id] = { name, choice: null, status: 'alive', progress: 0 };
    socket.emit('joined', { name });
    emitState();
  });

  socket.on('choose', (choice) => {
    const player = players[socket.id];
    if (!player || player.status !== 'alive' || phase !== 'question') return;
    if (choice !== 'A' && choice !== 'B') return;
    player.choice = choice;
    socket.emit('choiceAccepted', choice);
    emitState();
  });

  socket.on('getQuestions', (genre) => {
    requireHost(socket, () => {
      const list = (questions[genre] || []).map(({ correctAnswer, explanation, ...q }, index) => ({ ...q, index }));
      socket.emit('questionsList', { genre, questions: list });
    });
  });

  socket.on('startRandom', (genre) => {
    requireHost(socket, () => {
      const q = pickRandomQuestion(genre);
      if (!q) return;
      currentQuestion = { ...q, genre };
      usedQuestionIds.add(q.id);
      round += 1;
      phase = 'question';
      Object.values(players).forEach((p) => { p.choice = null; });
      io.emit('question', gameSnapshot().currentQuestion);
      emitState();
    });
  });

  socket.on('loadQuestion', (questionIndex, genre) => {
    requireHost(socket, () => {
      const pool = questions[genre];
      if (!pool || !pool[questionIndex]) return;
      currentQuestion = { ...pool[questionIndex], genre };
      usedQuestionIds.add(currentQuestion.id);
      round += 1;
      phase = 'question';
      Object.values(players).forEach((p) => { p.choice = null; });
      io.emit('question', gameSnapshot().currentQuestion);
      emitState();
    });
  });

  socket.on('revealAnswer', () => {
    requireHost(socket, () => {
      if (!currentQuestion || phase !== 'question') return;
      const correct = currentQuestion.correctAnswer;
      Object.values(players).forEach((p) => {
        if (p.status !== 'alive') return;
        if (p.choice === correct) p.progress += 1;
        else p.status = 'dead';
      });
      phase = alivePlayers().length <= 1 && Object.keys(players).length > 1 ? 'finished' : 'result';
      io.emit('showAnswer', {
        correct,
        explanation: currentQuestion.explanation,
        choiceA: currentQuestion.choiceA,
        choiceB: currentQuestion.choiceB,
        winner: phase === 'finished' && alivePlayers()[0] ? alivePlayers()[0].name : null
      });
      emitState();
    });
  });

  socket.on('next', () => {
    requireHost(socket, () => {
      currentQuestion = null;
      if (phase !== 'finished') phase = 'lobby';
      Object.values(players).forEach((p) => { p.choice = null; });
      io.emit('clear-question');
      emitState();
    });
  });

  socket.on('resetGame', () => {
    requireHost(socket, () => {
      currentQuestion = null;
      phase = 'lobby';
      round = 0;
      usedQuestionIds.clear();
      Object.values(players).forEach((p) => {
        p.choice = null;
        p.status = 'alive';
        p.progress = 0;
      });
      io.emit('gameReset');
      io.emit('clear-question');
      emitState();
    });
  });

  socket.on('disconnect', () => {
    if (socket.id === hostSocketId) hostSocketId = null;
    if (players[socket.id]) delete players[socket.id];
    emitState();
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`二択サバイバル起動中: port ${port}`);
});
