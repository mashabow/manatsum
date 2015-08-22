'use strict';

var staticPath = '../static/';
var UPM = 1000;  // units per em (@グリフ座標系)


function Canvas() {

    var self = this;
    this.glyph = null;

    this.snap = Snap('#canvas');
    this.snap.attr('viewBox', [0, 0, UPM, UPM]);


    // マウスドラッグのイベントリスナーを登録
    this.snap.drag(onmove, onstart, onend);

    // タッチイベントを拾うための当たり領域を作ってイベントリスナーを登録
    this.background = this.snap.rect(0, 0, UPM, UPM).addClass('background');
    this.background.touchstart(function(event) {
        var touch = event.targetTouches[0];
        onstart(touch.pageX, touch.pageY, event);
        event.preventDefault();
    });
    this.background.touchmove(function(event) {
        var touch = event.targetTouches[0];
        onmove(0, 0, touch.pageX, touch.pageY, event);
        event.preventDefault();
    });
    this.background.touchend(function(event) {
        onend(event);
        event.preventDefault();
    });


    // 画面左上から canvas の座標原点へのオフセット
    var jq = $('#canvas');
    var offset = jq.offset();
    var scale = UPM / jq.width();

    // 画面左上が原点とするCSS座標系 (x, y) から、グリフ座標系の Point を作成
    function makePoint(x, y) {
        return new Point(scale * (x - offset.left),
                         scale * (y - offset.top));
    }

    // touch/drag のイベントリスナー
    // glyph.onstart, glyph.onmove に渡す
    function onstart(x, y, event) {
        // マウス入力の場合は左クリック以外ではストロークを作らない
        if (event.type === 'mousedown' && event.button !== 0) return;
        self.glyph.onstart(makePoint(x, y));
    }
    function onmove(dx, dy, x, y) {
        if (x === null || y === null) return;
        self.glyph.onmove(makePoint(x, y));
    }
    function onend() {
        self.glyph.onend();
    }


    // characterList を読み込み
    var characterListFile = 'joyo1945.txt';
    $.ajax({
        context: this,
        url: staticPath + characterListFile,
        timeout: 10000
    }).done(function(data) {
        this.characterList = data.replace(/\s/g, '');  // 改行・空白を削除
        self.startTime = new Date();  // 収録開始時間
        this.setCharacterIndex(0);
        $('#total_num').text(this.characterList.length);
    }).fail(function() {
        alert(characterListFile + ' の読み込みに失敗しました');
    });

}



// キャンバスを白紙に
Canvas.prototype.clear = function() {
    if (!this.glyph) return;
    while (this.glyph.lastStrokeIndex > -1) {
        this.glyph.popStroke();
    }
};


// 最後に書いた1画を削除
Canvas.prototype.undo = function() {
    this.glyph.popStroke();
};


// 前の文字へ
Canvas.prototype.prev = function() {
    if (this.characterIndex === 0) {
        alert('最初の文字です');
    } else {
        this.setCharacterIndex(this.characterIndex - 1);
    }
};


// 次の文字へ
Canvas.prototype.next = function() {
    if (this.characterIndex === this.characterList.length - 1) {
        alert('最後の文字です');
    } else {
        this.setCharacterIndex(this.characterIndex + 1);
    }
};


// 指定したインデックスの文字へ移動
Canvas.prototype.setCharacterIndex = function(index) {

    // 範囲チェック
    if (index < 0 || this.characterList.length <= index) {
        alert('文字リストの範囲外です');
        return;
    }

    // sample, canvas 更新
    this.characterIndex = index;
    var character = this.characterList[this.characterIndex];
    sample.load(character);
    this.clear();
    this.glyph.character = character;

    // 現在文字更新
    $('#current_character').val(character);
    $('#current_num').val(this.characterIndex + 1);
    // gpm 更新
    var gpm = 1000 * 60 * this.characterIndex / (new Date() - this.startTime);
    $('#gpm').text(gpm.toFixed(1) + ' 文字/分');
    // プログレスバー更新
    var progress = 100 * this.characterIndex / this.characterList.length;
    $('.progress-bar').css('width', progress + '%');
    $('#percentage').text(progress.toFixed(1) + ' %');
};


// 指定した文字へ移動
Canvas.prototype.setCharacter = function(character) {
    var index = this.characterList.indexOf(character);
    if (index === -1) {
        alert('リストに含まれていない文字です');
        return;
    }
    this.setCharacterIndex(index);
};


// グリフデータを送信して次の文字へ
Canvas.prototype.post = function() {

    // 画数チェック
    if (this.glyph.lastStrokeIndex !== sample.strokeNum - 1) {
        // iPad では二重にアラートが表示されることがあるので setTimeout で回避する
        setTimeout(function(){ alert('画数が一致しません'); }, 0);
        return;
    }

    // 送信
    $('#post').text('送信中…').attr('disabled', true);
    $.ajax({
        context: this,
        url: 'post/',
        type: 'POST',
        data: {
            csrfmiddlewaretoken: $.cookie('csrftoken'),
            glyph_json: this.glyph.toJSON()
        },
        timeout: 10000  // 単位はミリ秒
    }).done(function() {
        this.next();
    }).fail(function() {
        alert('送信に失敗しました');
    }).always(function() {
        $('#post').text('送信').attr('disabled', false);
    });
};



function Glyph() {

    this.character = '';

    // ストロークの配列
    // ストロークオブジェクトは最初に strokesArraySize 個作っておき、これを使いまわす
    this.strokes = [];
    var strokesArraySize = 40;
    for (var i = 0; i < strokesArraySize; i++) {
        this.strokes[i] = new Stroke();
    }

    // 最後に書いたストロークの index
    this.lastStrokeIndex = -1;

    // 現在書いている途中のストローク
    // タッチ中・ドラッグ中でなければ null
    this.writingStroke = null;
}


// 現在時刻を書き始めの時刻としてセット
// 1画目を書き始めたときに呼び出される
Glyph.prototype.setTimeOrigin = function() {
    this.timeOrigin = new Date();
};


// timeOrigin からの時間 [ms] を求める
Glyph.prototype.getTimeDelta = function() {
    return new Date().getTime() - this.timeOrigin.getTime();
};


// グリフデータを JSON の文字列に変換
Glyph.prototype.toJSON = function() {
    var obj = {
        character: this.character,
        strokes: [],
        timeOrigin: this.timeOrigin
    };
    // strokes には実際に書いたストロークのみを入れる
    for (var i = 0; i <= this.lastStrokeIndex; i++) {
        obj.strokes.push(this.strokes[i].points);
    }
    return JSON.stringify(obj);
};


// ストロークの開始
Glyph.prototype.onstart = function(point) {

    // 別のストロークを書いている途中であった場合、それを終了させる
    if (this.writingStroke) {
        this.onend(point);
    }

    if (this.lastStrokeIndex === -1) this.setTimeOrigin();
    this.writingStroke = this.strokes[this.lastStrokeIndex + 1];
    point.time = this.getTimeDelta();
    this.writingStroke.append(point);
};


// ストロークを延ばす
Glyph.prototype.onmove = function(point) {
    if (!this.writingStroke) return;
    point.time = this.getTimeDelta();
    this.writingStroke.append(point);
};


// ストロークの終了
Glyph.prototype.onend = function() {
    if (!this.writingStroke) return;
    if (this.writingStroke.isValid()) {
        this.lastStrokeIndex++;
        sample.updateStrokeHighlight();
    } else {
        // 無効なストロークは捨てる
        this.writingStroke.clear();
    }
    this.writingStroke = null;
};


// 一番上のストロークを消す
Glyph.prototype.popStroke = function() {
    if (this.lastStrokeIndex < 0) return;
    this.strokes[this.lastStrokeIndex].clear();
    this.lastStrokeIndex--;
    sample.updateStrokeHighlight();
};



function Stroke() {
    this.points = [];
    this.snap = canvas.snap.polyline();
    this.snap.attr('points', '');
}


// 有効なストロークか否か
Stroke.prototype.isValid = function() {

    var len = this.points.length;

    // 最低でも2点が必要
    if (len < 2) return false;

    // 枠外の点があれば不可
    for (var i = 0; i < len; i++) {
        var p = this.points[i];
        if (p.x < 0 || UPM <= p.x ||
            p.y < 0 || UPM <= p.y) {
            return false;
        }
    }
    return true;
};


// ストロークを延長する
Stroke.prototype.append = function(point) {
    this.points.push(point);
    var str = this.points.map(function (p) {
        return p.x + ',' + p.y;
    }).join(' ');
    this.snap.attr('points', str);
};


// ストロークを空にする
Stroke.prototype.clear = function() {
    this.points = [];
    this.snap.attr('points', '');
};



function Point(x, y, time) {
    this.x = parseInt(x);
    this.y = parseInt(y);
    this.time = time;  // optional
}



function Sample() {

    this.snap = Snap('#sample');

    // kvg のグリフ名（e.g. U+56AB → 056ab）
    this.kvgGlyphName = '';

    // 画数
    this.strokeNum = 0;
}


// 文字 character のサンプルを読み込んで表示する
Sample.prototype.load = function(character) {
    this.kvgGlyphName = '0' + character.charCodeAt(0).toString(16);
    var url = staticPath + 'sample_svg/' + this.kvgGlyphName + '.svg';
    Snap.load(url, function(f) {
        this.snap.selectAll('g').forEach(function(element) {
            element.remove();
        });
        this.snap.append(f.selectAll('svg>g'));
        this.strokeNum = this.snap.selectAll('path').length;
        this.updateStrokeHighlight();
    }, this);
    this.snap.attr('viewBox', '0 0 109 109');
};


// ストロークのハイライト表示を更新
// 書いている途中であれば、それに対応するストロークをハイライトし、
// 書いていない状態では、次に書くべきストロークをハイライトする
Sample.prototype.updateStrokeHighlight = function() {
    var oldStroke = this.snap.select('.highlight');
    if (oldStroke) {
        oldStroke.attr('class', '');
    }
    var index = canvas.glyph.lastStrokeIndex + 1;
    var id = 'kvg:' + this.kvgGlyphName + '-s' + (index + 1);
    var newStroke = this.snap.select('[id="' + id + '"]');
    if (newStroke) {
        newStroke.attr('class', 'highlight');
    }
};




// Django の CSRF 対策に対応する
$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        function sameOrigin(url) {
            // url could be relative or scheme relative or absolute
            var host = document.location.host; // host + port
            var protocol = document.location.protocol;
            var srOrigin = '//' + host;
            var origin = protocol + srOrigin;
            // Allow absolute or scheme relative URLs to same origin
            return (url === origin || url.slice(0, origin.length + 1) === origin + '/') ||
                (url === srOrigin || url.slice(0, srOrigin.length + 1) === srOrigin + '/') ||
                // or any other URL that isn't scheme relative or absolute i.e relative.
                !(/^(\/\/|http:|https:).*/.test(url));
        }
        function safeMethod(method) {
            return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
        }
        if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
            xhr.setRequestHeader('X-CSRFToken', $.cookie('csrftoken'));
        }
    }
});



var sample = new Sample();
var canvas = new Canvas();
canvas.glyph = new Glyph();  // この Glyph オブジェクトは使いまわされる


$(function(){

    // タッチスクロール禁止
    $('body').bind('touchmove', function() {
        event.preventDefault();
    });

    // ボタン押下時のハンドラ
    var event = 'ontouchstart' in window ? 'touchend' : 'click';
    $('#post').bind(event, function() {
        canvas.post();
        event.preventDefault();
    });
    $('#clear').bind(event, function() {
        canvas.clear();
        event.preventDefault();
    });

    // テキスト入力
    $('#current_num').change(function() {
        var index = $(this).val() - 1;
        canvas.setCharacterIndex(index);
    });
    $('#current_character').change(function() {
        canvas.setCharacter($(this).val());
    });


    // キー操作
    $(document).keydown(function(event) {
        switch (event.which) {
        case 82: // r
            canvas.clear();
            break;
        case 90: // z
            canvas.undo();
            break;
        case 32: // space
            event.preventDefault();
            canvas.post();
            break;
        case 80: // p
            canvas.prev();
            break;
        case 78: // n
            canvas.next();
            break;
        }
    });
});
