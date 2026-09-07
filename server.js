const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};
let currentQuestion = null;

// サンプル問題プリセット（複数ジャンル）
const questions = {
    kanji: [
        { question: "重複", choiceA: "ちょうふく", choiceB: "じゅうふく", correctAnswer: "A", difficulty: 1 },
        { question: "貼付", choiceA: "ちょうふく", choiceB: "はりつけ", correctAnswer: "B", difficulty: 1 },
        { question: "一段落", choiceA: "ひとだんらく", choiceB: "いちだんらく", correctAnswer: "A", difficulty: 1 },
        { question: "敷衍", choiceA: "ふえん", choiceB: "しきえん", correctAnswer: "B", difficulty: 2 },
        { question: "対峙", choiceA: "たいし", choiceB: "たいち", correctAnswer: "A", difficulty: 2 },
        { question: "雑然", choiceA: "ざつぜん", choiceB: "ぞうぜん", correctAnswer: "A", difficulty: 1 },
        { question: "蛇口", choiceA: "じゃぐち", choiceB: "へびぐち", correctAnswer: "A", difficulty: 1 },
        { question: "破天荒", choiceA: "はてんこう", choiceB: "はてんこうな", correctAnswer: "A", difficulty: 2 },
        { question: "汚名返上", choiceA: "おめいはんじょう", choiceB: "おめいへんじょう", correctAnswer: "A", difficulty: 2 },
        { question: "ご飯粒", choiceA: "ごはんつぶ", choiceB: "ごはんりゅう", correctAnswer: "A", difficulty: 1 }
    ],
    country_area: [
        { question: "面積が大きいのはどっち？", choiceA: "カナダ", choiceB: "アメリカ", correctAnswer: "A", difficulty: 1 },
        { question: "面積が大きいのはどっち？", choiceA: "ロシア", choiceB: "カナダ", correctAnswer: "A", difficulty: 1 },
        { question: "面積が大きいのはどっち？", choiceA: "オーストラリア", choiceB: "インド", correctAnswer: "B", difficulty: 1 },
        { question: "面積が大きいのはどっち？", choiceA: "ブラジル", choiceB: "インドネシア", correctAnswer: "A", difficulty: 2 },
        { question: "面積が大きいのはどっち？", choiceA: "南アフリカ", choiceB: "メキシコ", correctAnswer: "A", difficulty: 1 },
        { question: "面積が大きいのはどっち？", choiceA: "エジプト", choiceB: "イラン", correctAnswer: "B", difficulty: 2 }
    ],
    country_population: [
        { question: "人口が多いのはどっち？", choiceA: "インド", choiceB: "中国", correctAnswer: "A", difficulty: 1 },
        { question: "人口が多いのはどっち？", choiceA: "インドネシア", choiceB: "パキスタン", correctAnswer: "A", difficulty: 1 },
        { question: "人口が多いのはどっち？", choiceA: "ブラジル", choiceB: "ナイジェリア", correctAnswer: "B", difficulty: 2 },
        { question: "人口が多いのはどっち？", choiceA: "バングラデシュ", choiceB: "メキシコ", correctAnswer: "A", difficulty: 1 },
        { question: "人口が多いのはどっち？", choiceA: "ロシア", choiceB: "日本", correctAnswer: "A", difficulty: 1 },
        { question: "人口が多いのはどっち？", choiceA: "フィリピン", choiceB: "エジプト", correctAnswer: "A", difficulty: 2 }
    ],
    general: [
        { question: "富士山の高さはどっち？", choiceA: "3,776m", choiceB: "3,676m", correctAnswer: "A", difficulty: 2 },
        { question: "地球の直径はどっち？", choiceA: "12,742km", choiceB: "11,742km", correctAnswer: "A", difficulty: 2 },
        { question: "火星の衛星数は？", choiceA: "2個", choiceB: "3個", correctAnswer: "A", difficulty: 2 },
        { question: "太陽系の惑星数は？", choiceA: "8個", choiceB: "9個", correctAnswer: "A", difficulty: 1 },
        { question: "ピラミッドの建設期間は？", choiceA: "約20年", choiceB: "約50年", correctAnswer: "A", difficulty: 2 },
        { question: "日本の首都は？", choiceA: "東京", choiceB: "京都", correctAnswer: "A", difficulty: 1 }
    ]
};

io.on('connection', (socket) => {
    socket.on('join', (name) => {
        players[socket.id] = { name: name, choice: null, status: 'alive', x: 50, progress: 0 };
        io.emit('update', players);
        if (currentQuestion) {
            socket.emit('question', currentQuestion);
        }
    });

    socket.on('choose', (choice) => {
        if (players[socket.id] && players[socket.id].status === 'alive') {
            players[socket.id].choice = choice;
            players[socket.id].x = choice === 'A' ? 20 : 80;
            io.emit('update', players);
        }
    });

    socket.on('judge', (selectedAnswer) => {
        if (currentQuestion) {
            const correctAnswer = currentQuestion.correctAnswer;
            io.emit('showAnswer', { correct: correctAnswer, selected: selectedAnswer });
            
            for (let id in players) {
                if (players[id].status === 'alive' && players[id].choice !== correctAnswer) {
                    players[id].status = 'dead';
                } else if (players[id].status === 'alive' && players[id].choice === correctAnswer) {
                    players[id].progress += 1;
                }
            }
            io.emit('update', players);
        }
    });

    socket.on('next', () => {
        for (let id in players) {
            if (players[id].status === 'alive') {
                players[id].choice = null;
                players[id].x = 50;
            }
        }
        currentQuestion = null;
        io.emit('update', players);
        io.emit('clear-question');
    });

    socket.on('loadQuestion', (questionIndex, genre) => {
        if (questions[genre] && questionIndex >= 0 && questionIndex < questions[genre].length) {
            currentQuestion = { ...questions[genre][questionIndex], genre: genre };
            io.emit('question', currentQuestion);
            for (let id in players) {
                players[id].choice = null;
                players[id].x = 50;
            }
            io.emit('update', players);
        }
    });

    socket.on('getQuestions', (genre) => {
        if (questions[genre]) {
            socket.emit('questionsList', questions[genre]);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('update', players);
    });
});

server.listen(3000, () => {
    console.log('サーバー起動中: ポート3000');
});
