// 全視窗畫布 + 支援 stop 與 walk sprite、左右鍵移動與翻轉
const sprites = {
  stop: { path: '1/stop/stop_1.png', frames: 8, img: null, frameW: 699 / 8, frameH: 190, delay: 6 },
  walk: { path: '1/walk/walk_1.png', frames: 8, img: null, frameW: 1019 / 8, frameH: 195, delay: 6 },
  jump: { path: '1/jump/jump_1.png', frames: 19, img: null, frameW: 3054 / 19, frameH: 214, delay: 2 }
};
// 新增 push 與 light sprite 設定（空白鍵發動與發射物）
sprites.push = { path: '1/push/push_1.png', frames: 10, img: null, frameW: 2215 / 10, frameH: 185, delay: 4 };
sprites.light = { path: '1/light/light_1.png', frames: 4, img: null, frameW: 591 / 4, frameH: 19, delay: 6 };

// 新增左側重複顯示的角色（2/stop/stop_all.png，總共 13 張）
sprites.leftChar = {
  path: '2/stop/stop_all.png',
  frames: 13,
  img: null,
  frameW: 1815 / 13,
  frameH: 212,
  delay: 6
};
// 新增右側重複顯示的角色（3/stop/stop_all.png，總共 6 張）
sprites.rightChar = {
  path: '3/stop/stop_all.png',
  frames: 6,
  img: null,
  frameW: 355 / 6,
  frameH: 87,
  delay: 6
};
// 新增：右側微笑狀態的 sprite（3/smile/save_all.png，總共 4 張，整體外框 227*101）
sprites.rightCharSmile = {
  path: '3/smile/save_all.png',
  frames: 4,
  img: null,
  frameW: 227 / 4,
  frameH: 101,
  delay: 6
};

// 新增：角色4（顯示在角色2 左側）的 sprite 設定（4/stop/all.png，總共 8 張，整體 459*55）
sprites.leftChar4 = {
  path: '4/stop/all.png',
  frames: 8,
  img: null,
  frameW: 459 / 8,
  frameH: 55,
  delay: 6
};
// 新增：角色5（提示小精靈），使用 5/0.png，大小 49*84
sprites.char5 = {
  path: '5/0.png',
  frames: 1, // 假設為單張圖或依需求調整
  img: null,
  frameW: 49,
  frameH: 84,
  delay: 6
};

let loading = true;
let currentSprite = 'stop';
let frameIndex = 0;
let frameDelay = 6; // 控制動畫速度（數字越小越快）

// 新增左側角色的幀索引（用於循環全部 13 張）
let leftCharIndex = 0;
// 新增：固定的左側角色 X 座標（null 表示尚未初始化）
let leftCharX = null;
// 角色4（出現在角色2 左側）幀索引與位置
let leftChar4Index = 0;
let leftChar4X = null;
let leftChar4DisplayHeight = 0;
// 新增右側角色幀索引（循環 6 張）
let rightCharIndex = 0;
let rightCharX = null; // 新增：固定的右側角色 X 座標（null 表示尚未初始化）
let rightCharUsingSmile = false; // 是否在使用微笑 sprite
let rightCharDisplayHeight = 0; // 用來記錄右側角色實際顯示高度，供對話框定位使用
let leftCharDisplayHeight = 0; // 記錄左側角色實際顯示高度（供題目定位使用）
// 新增角色5 的位置與對話變數
let char5X = null;
let dialogStateText5 = ''; // 角色5 要顯示的文字（主要用於提示）

// 背景圖片（若要用 picture/0.png 作為背景）
let bgImg = null;

let posX, posY;
let speed = 3; // 移動速度（像素/幀）
let facing = 1; // 1: 向右 (預設), -1: 向左
// 跳躍相關
let jumping = false;
let jumpProgress = 0; // 畫面幀的進度（用於對應 jump sprite 的幀）
let basePosY = 0; // 跳躍開始時的地面 Y
let jumpHeight = 150; // 跳躍高度（像素），會在載入 sprite後依大小調整
// 推擠（發動）相關
let pushing = false;
let pushProgress = 0;
// 射出物
let projectiles = []; // 每個項目 {x,y,dir,sprite,frameIndex,progress,sw,sh,dw,dh,speed}

// ---------- 測驗題庫與 UI 相關 ----------
let questionsTable = null; // 由 CSV 載入
let currentQ = null; // {question,answer,correct_feedback,wrong_feedback,hint}
let inputAnswer, btnSubmit, btnNext, btnDownload, btnStart, btnRestart;
let dialogStateText = ''; // 要顯示在角色 2 的文字（問題或回饋）
let dialogStateTextRight = ''; // 角色3（右側）要顯示的文字（問題或回饋）
let dialogStateText4 = ''; // 角色4（左側最外）要顯示的文字（問題或回饋）
let lastPlayerAnswer = '';
let cnv = null; // p5 canvas element reference

// 新增遊戲狀態變數
let correctCount = 0;
let wrongCount = 0;
const WIN_THRESHOLD = 5; // 答對 5 題過關
const LOSE_THRESHOLD = 3; // 答錯 3 題失敗
let gameOver = false;
let gameWon = false;

function preload() {
  // 同步載入兩個 sprite 檔案（若不存在，會在 console 顯示錯誤）
  for (const key in sprites) {
    const s = sprites[key];
    s.img = loadImage(s.path, () => {
      console.log('載入完成:', s.path);
      // 更新實際每幀寬高
      s.frameW = s.img.width / s.frames;
      s.frameH = s.img.height;
    }, (err) => {
      console.error('載入失敗:', s.path, err);
    });
  }

  // 嘗試載入背景圖片（位於 picture/0.png）
  bgImg = loadImage('picture/0.png', () => {
    console.log('背景圖載入完成: picture/0.png');
  }, (err) => {
    console.warn('背景圖載入失敗: picture/0.png', err);
    bgImg = null;
  });
}

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  imageMode(CENTER);
  frameRate(60);

  // 初始位置：畫布中央
  posX = width / 2;
  posY = height / 2;
  basePosY = posY;

  // 建立互動輸入與按鈕（p5 DOM）
  inputAnswer = createInput('');
  inputAnswer.attribute('placeholder', '在此輸入答案 (數字)');
  // 位置改為在 draw() 內動態放到左側對話框內
  inputAnswer.size(140);
  inputAnswer.style('font-size', '16px');
  inputAnswer.style('padding', '6px');
  inputAnswer.style('border', 'none');
  inputAnswer.style('background', '#fff');
  inputAnswer.style('font-size', '16px');
  // 預設不要把焦點放在輸入框上（避免方向鍵被輸入框攔截）
  try { inputAnswer.elt.blur(); } catch (err) { }
  inputAnswer.hide(); // 一開始先隱藏

  btnSubmit = createButton('送出');
  btnSubmit.size(64, 28);
  // 位置在 draw() 中會動態調整到輸入框右側
  btnSubmit.mousePressed(submitAnswer);
  btnSubmit.style('border', 'none');
  btnSubmit.style('background', '#eee');
  btnSubmit.style('padding', '4px 8px');
  btnSubmit.hide(); // 一開始先隱藏

  btnNext = createButton('下一題');
  btnNext.size(80, 28);
  // 位置在 draw() 中會動態調整
  btnNext.mousePressed(() => {
    pickRandomQuestion();
  });
  btnNext.style('border', 'none');
  btnNext.style('background', '#eee');
  btnNext.style('padding', '4px 8px');
  btnNext.hide(); // 一開始先隱藏

  // 新增：下載 CSV 按鈕
  btnDownload = createButton('下載題庫 CSV');
  btnDownload.position(20, 10);
  btnDownload.mousePressed(downloadCSV);
  btnDownload.hide(); // 一開始先隱藏

  // 新增：開始遊戲按鈕
  btnStart = createButton('開始遊戲');
  btnStart.position(width / 2 - 60, height / 2 + 120);
  btnStart.size(120, 40);
  btnStart.style('font-size', '20px');
  btnStart.style('cursor', 'pointer');
  btnStart.mousePressed(() => {
    loading = false;
    btnStart.hide();
    btnDownload.show(); // 遊戲開始後顯示下載按鈕
  });

  // 新增：重新開始按鈕
  btnRestart = createButton('重新開始');
  btnRestart.size(120, 40);
  btnRestart.style('font-size', '20px');
  btnRestart.style('cursor', 'pointer');
  btnRestart.mousePressed(restartGame);
  btnRestart.hide();

  // 新增：程式碼亂數產生抽題 (模擬 CSV 結構)
  generateRandomQuestions();

  // Enter 鍵送出，送出後自動失去焦點以還原方向鍵控制
  inputAnswer.elt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      submitAnswer();
      try { inputAnswer.elt.blur(); } catch (err) { }
    }
  });

  // 先抽一題（若 CSV 尚未載入，會在載入完成後改為有題）
  pickRandomQuestion();
}

function draw() {
  if (loading) {
    // 繪製加載畫面背景
    if (bgImg && bgImg.width) {
      push();
      imageMode(CENTER);
      image(bgImg, width / 2, height / 2, width, height);
      pop();

      // 增加半透明圓角矩形底圖，確保文字清晰可見
      push();
      rectMode(CENTER);
      fill(255, 220); // 微透明白色
      noStroke();
      rect(width / 2, height / 2, 500, 350, 20);
      pop();
    } else {
      background(255);
    }

    // 顯示遊戲標題與說明
    textAlign(CENTER, CENTER);
    fill(0);
    textSize(40);
    text('數學互動測驗', width / 2, height / 2 - 80);
    textSize(20);
    text('遊戲說明：\n\n← → 方向鍵移動\n空白鍵：攻擊\n上鍵：跳躍\n\n靠近角色即可回答問題', width / 2, height / 2 + 20);
    return;
  }

  // 自訂背景（若載入 picture/0.png 則使用該圖，否則顯示白底）
  if (bgImg && bgImg.width) {
    push();
    imageMode(CENTER);
    // 將背景圖填滿畫布（若想保持比例可改為等比縮放）
    image(bgImg, width / 2, height / 2, width, height);
    pop();
  } else {
    background(255);
  }

  // 判斷鍵盤狀態：左右鍵持續按著則移動（跳躍時仍可左右移動）
  let moving = false;
  if (keyIsDown(RIGHT_ARROW)) {
    moving = true;
    // 只在非跳躍狀態更新 currentSprite，跳躍會覆蓋成 jump
    if (!jumping) currentSprite = 'walk';
    facing = 1;
    posX += speed;
  } else if (keyIsDown(LEFT_ARROW)) {
    moving = true;
    if (!jumping) currentSprite = 'walk';
    facing = -1;
    posX -= speed;
  } else {
    if (!jumping) currentSprite = 'stop';
  }

  // 選取要用的 sprite（優先順序：push > jump > currentSprite）
  const s = pushing ? sprites['push'] : (jumping ? sprites['jump'] : sprites[currentSprite]);
  // 若當前 sprite 尚未載入，顯示等待文字
  if (!s.img || !s.img.width) {
    push();
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(`載入 sprite 中或找不到檔案：${s.path}`, width / 2, height / 2);
    pop();
    return;
  }

  // 控制動畫幀與跳躍進度
  const delay = s.delay || frameDelay;
  if (frameCount % delay === 0) {
    if (pushing) {
      // 推擠時逐幀前進
      pushProgress++;
      frameIndex = Math.min(pushProgress, s.frames - 1);
    } else if (jumping) {
      // 跳躍時我們希望逐幀推進直到完成
      jumpProgress++;
      frameIndex = Math.min(jumpProgress, s.frames - 1);
    } else {
      frameIndex = (frameIndex + 1) % s.frames;
    }
  }

  // 若正在跳躍，根據進度計算垂直位移（用拋物線：t*(1-t)）
  if (jumping) {
    const total = s.frames - 1;
    const t = constrain(jumpProgress / total, 0, 1);
    // 使用一個彈跳曲線，最高點在 t=0.5
    const yOffset = jumpHeight * 4 * t * (1 - t);
    posY = basePosY - yOffset;
    // 跳躍結束
    if (jumpProgress >= total) {
      jumping = false;
      jumpProgress = 0;
      frameIndex = 0;
      posY = basePosY;
      // 結束後回復到對應動作
      currentSprite = moving ? 'walk' : 'stop';
    }
  } else {
    // 非跳躍時保持在地面
    posY = basePosY;
  }

  // 若正在推擠（空白鍵觸發）並且推擠動畫結束，生成發射物
  if (pushing) {
    const ps = sprites['push'];
    const totalP = ps.frames - 1;
    if (pushProgress >= totalP) {
      // 生成 light 發射物
      const ls = sprites['light'];
      // 設定發射物的顯示寬高（根據 light sprite 與畫面縮放）
      const sw_l = ls.frameW;
      const sh_l = ls.frameH;
      const maxScaleL = Math.min((width * 0.2) / sw_l, (height * 0.2) / sh_l);
      const dw_l = maxScaleL < 1 ? sw_l * maxScaleL : sw_l;
      const dh_l = maxScaleL < 1 ? sh_l * maxScaleL : sh_l;
      const spawnX = posX + (facing * (dw_l / 2 + 20));
      const spawnY = posY;
      projectiles.push({ x: spawnX, y: spawnY, dir: facing, sprite: ls, frameIndex: 0, progress: 0, sw: sw_l, sh: sh_l, dw: dw_l, dh: dh_l, speed: 6 });

      // 重設推擠狀態
      pushing = false;
      pushProgress = 0;
      frameIndex = 0;
      // 結束後回到站或走路
      currentSprite = moving ? 'walk' : 'stop';
    }
  }

  // 更新並繪製所有發射物
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    // 動畫更新
    const ld = p.sprite.delay || 6;
    if (frameCount % ld === 0) {
      p.progress++;
      p.frameIndex = p.progress % p.sprite.frames;
    }
    // 移動
    p.x += p.speed * p.dir;
    // 繪製（支援翻轉）
    push();
    translate(p.x, p.y);
    scale(p.dir, 1);
    const sx_l = p.frameIndex * p.sw;
    image(p.sprite.img, 0, 0, p.dw, p.dh, sx_l, 0, p.sw, p.sh);
    pop();

    // 移除畫面外的發射物
    if (p.x < -p.dw || p.x > width + p.dw) {
      projectiles.splice(i, 1);
    }
  }

  // 計算來源子影像位置與尺寸
  const sw = s.frameW;
  const sh = s.frameH;
  const sx = frameIndex * sw;
  const sy = 0;

  // 計算要顯示的目標尺寸，若太大則縮放到畫布 90% 內
  let dw = sw;
  let dh = sh;
  const maxScale = Math.min((width * 0.9) / sw, (height * 0.9) / sh);
  if (maxScale < 1) {
    dw = sw * maxScale;
    dh = sh * maxScale;
  }

  // 若為 jump sprite，調整 jumpHeight 以貼合顯示高度
  if (s === sprites['jump']) {
    // 讓跳躍高度為顯示高度的 60%（但不超過畫面高度的一半）
    jumpHeight = Math.min(dh * 0.6, height * 0.5);
  }

  // ----- 新增：在原本角色左邊重複顯示 leftChar sprite（循環全部 13 張） -----
  const lc = sprites.leftChar;
  if (lc && lc.img && lc.img.width) {
    // 更新左側角色的幀（循環全部 lc.frames，也就是 13 張）
    if (frameCount % lc.delay === 0) {
      leftCharIndex = (leftCharIndex + 1) % lc.frames; // 0..12
    }

    // 計算 leftChar 顯示尺寸（縮放到與主角相近或根據畫面縮放）
    const swL = lc.frameW;
    const shL = lc.frameH;
    const maxScaleL = Math.min((width * 0.15) / swL, (height * 0.15) / shL, 1);
    const dwL = swL * maxScaleL;
    const dhL = shL * maxScaleL;
  // 記錄左側角色顯示高度，供題目顯示距離與位置計算
  leftCharDisplayHeight = dhL;

    // 從主角左側只顯示一個 leftChar（位置固定，不跟隨主角移動）
    let spacing = dwL + 8;
    // 若尚未初始化 leftCharX，則以當前主角位置設定一次（之後不變）
    if (leftCharX === null) {
      // 固定為畫面左側的約 33% 處，確保 leftChar（角色2）位置穩定且為畫面左側角色
      leftCharX = width * 0.33;
    }
    let x = leftCharX;
    push();
    translate(x, basePosY);
    const sxL = leftCharIndex * swL;
    image(lc.img, 0, 0, dwL, dhL, sxL, 0, swL, shL);
    pop();
  }
  // ----- 新增：在角色2 左側顯示角色4（固定位置，不受鍵盤控制） -----
  const lc4 = sprites.leftChar4;
  if (lc4 && lc4.img && lc4.img.width) {
    if (frameCount % lc4.delay === 0) {
      leftChar4Index = (leftChar4Index + 1) % lc4.frames;
    }

    // 計算顯示尺寸
    const sw4 = lc4.frameW;
    const sh4 = lc4.frameH;
    const maxScale4 = Math.min((width * 0.12) / sw4, (height * 0.12) / sh4, 1);
  let dw4 = sw4 * maxScale4;
  let dh4 = sh4 * maxScale4;
  // 放大角色4（調整此係數可改變大小）
  const left4Scale = 1.3;
  dw4 *= left4Scale;
  dh4 *= left4Scale;
  leftChar4DisplayHeight = dh4;

    // 計算 leftChar 的顯示寬度（用於定位角色4）
    const lcMain = sprites.leftChar;
    let dwL_for4 = dw4; // fallback
    if (lcMain && lcMain.img && lcMain.img.width) {
      const swL_check = lcMain.frameW;
      const shL_check = lcMain.frameH;
      const maxScaleL_check = Math.min((width * 0.15) / swL_check, (height * 0.15) / shL_check, 1);
      dwL_for4 = swL_check * maxScaleL_check;
    }

    // 若尚未初始化 leftChar4X，則設定為 leftCharX 左側
    if (leftChar4X === null) {
      leftChar4X = leftCharX - (dwL_for4 + dw4 + 8);
    }

    push();
    translate(leftChar4X, basePosY);
    const sx4 = leftChar4Index * sw4;
    image(lc4.img, 0, 0, dw4, dh4, sx4, 0, sw4, sh4);
    pop();

    // 題目顯示：當靠近角色4 時，角色4 顯示題目或回饋（行為類似角色3）
    const bw4 = 300;
    const bh4 = 90;
    const marginY4 = 12;
    const by4 = basePosY - (leftChar4DisplayHeight / 2) - (bh4 / 2) - marginY4;

    let showQuestion4 = false;
    const dist4 = Math.abs(posX - leftChar4X);
    const proximityThreshold4 = dw / 2 + dw4 / 2 + 80;
    showQuestion4 = dist4 <= proximityThreshold4;

    if (showQuestion4 && !gameOver) {
      // 放在角色4 的右側（靠近角色2 方向）
      const gap4 = 12;
      const bxCandidate4 = leftChar4X + (dw4 / 2) + (bw4 / 2) + gap4;
      const bx4 = constrain(bxCandidate4, bw4 / 2, width - bw4 / 2);

  push();
  drawComicBubble(bx4, by4, bw4, bh4, leftChar4X);

  textAlign(LEFT, TOP);
  noStroke();
  fill(0);
  text(dialogStateText4 || (currentQ ? currentQ.question : '載入題庫中...'), bx4 - bw4 / 2 + 10, by4 - bh4 / 2 + 10, bw4 - 20, bh4 - 20);
  pop();

      // 顯示輸入欄（同樣放在玩家上方，維持原有行為）
      try {
        const rect = cnv.elt.getBoundingClientRect();
        const inputW = 140;
        const inputHOffset = 60;
        const ix = Math.round(rect.left + (posX - inputW / 2));
        const iy = Math.round(rect.top + (posY - (dh / 2) - inputHOffset));
        inputAnswer.position(ix, iy);
        btnSubmit.position(ix + inputW + 8, iy);
        btnNext.position(ix + inputW + 8 + 72, iy);
        inputAnswer.show();
        btnSubmit.show();
        btnNext.show();
      } catch (err) {
        // ignore
      }
    }
  }
  // ----- 新增區塊結束 -----

  // ----- 右側：固定顯示 single rightChar，接近時切換到 smile（循環播放），遠離時恢復 idle -----
  const rcIdle = sprites.rightChar;
  const rcSmile = sprites.rightCharSmile;
  const rcAvailable = rcIdle && rcIdle.img && rcIdle.img.width;
  const rsAvailable = rcSmile && rcSmile.img && rcSmile.img.width;

  if (rcAvailable) {
    // 以 idle sprite 計算初始顯示尺寸與 spacing（確保位置穩定）
    const swR_idle = rcIdle.frameW;
    const shR_idle = rcIdle.frameH;
    const maxScaleR_idle = Math.min((width * 0.12) / swR_idle, (height * 0.12) / shR_idle, 1);
    const dwR_idle = swR_idle * maxScaleR_idle;
    const dhR_idle = shR_idle * maxScaleR_idle;

    // 初始化固定位置（只在第一次繪製時設定）
    const spacingR = dwR_idle + 8;
    if (rightCharX === null) {
      rightCharX = posX + (dw / 2) + spacingR;
    }
    const rightX = rightCharX;

    // 判斷主角與右側角色的距離（水平距離），決定是否切換到 smile
    const dist = Math.abs(posX - rightX);
    const proximityThreshold = dw / 2 + dwR_idle / 2 + 80; // 可調整閾值

    if (rsAvailable && dist <= proximityThreshold) {
      if (!rightCharUsingSmile) {
        rightCharUsingSmile = true;
        rightCharIndex = 0; // 重置幀以平滑過渡
      }
    } else {
      if (rightCharUsingSmile) {
        rightCharUsingSmile = false;
        rightCharIndex = 0;
      }
    }

    // 選取目前要播放的 sprite（smile 或 idle）
    const rc = rightCharUsingSmile && rsAvailable ? rcSmile : rcIdle;
    const swR = rc.frameW;
    const shR = rc.frameH;
    const maxScaleR = Math.min((width * 0.12) / swR, (height * 0.12) / shR, 1);
    let dwR = swR * maxScaleR;
    let dhR = shR * maxScaleR;
    // 放大角色3（調整此係數可改變大小）
    const rightScale = 1.25;
    dwR *= rightScale;
    dhR *= rightScale;
  // 記錄右側角色實際顯示高度，後面用來把對話框放在角色正上方
  rightCharDisplayHeight = dhR;

    // 更新幀（使用該 sprite 的 frames 與 delay，並循環播放）
    if (frameCount % rc.delay === 0) {
      rightCharIndex = (rightCharIndex + 1) % rc.frames;
    }

    // 繪製（位置固定，播放對應 sprite 的子影像）
    push();
    translate(rightX, basePosY);
    const sxR = rightCharIndex * swR;
    image(rc.img, 0, 0, dwR, dhR, sxR, 0, swR, shR);
    pop();
  }
  // ----- 右側結束 -----

  // ----- 新增：角色5（提示精靈），顯示在畫面右側，答錯時給予提示 -----
  const c5 = sprites.char5;
  if (c5 && c5.img && c5.img.width) {
    // 初始化位置（畫面右側約 85% 處）
    if (char5X === null) {
      char5X = width * 0.85;
    }

    // 計算顯示尺寸
    const sw5 = c5.frameW;
    const sh5 = c5.frameH;
    const maxScale5 = Math.min((width * 0.1) / sw5, (height * 0.1) / sh5, 1);
    let dw5 = sw5 * maxScale5 * 1.5; // 稍微放大一點
    let dh5 = sh5 * maxScale5 * 1.5;

    push();
    translate(char5X, basePosY);
    // 讓角色上下浮動，增加動態感
    let floatY = sin(frameCount * 0.05) * 10;
    translate(0, floatY - dh5 / 2); 
    image(c5.img, 0, 0, dw5, dh5);
    pop();

    // 顯示對話框（當有提示文字時）
    if (dialogStateText5) {
      const bw5 = 200;
      const bh5 = 80;
      const by5 = basePosY + floatY - dh5 - bh5 / 2 - 20; // 在角色上方
      
      push();
      drawComicBubble(char5X, by5, bw5, bh5, char5X);
      textAlign(LEFT, TOP);
      noStroke();
      fill(0);
      text(dialogStateText5, char5X - bw5 / 2 + 10, by5 - bh5 / 2 + 10, bw5 - 20, bh5 - 20);
      pop();
    }
  }
  // ----- 角色5 結束 -----

  // ----- 顯示對話框（右側為出題者 character3，左側為玩家/character1 的輸入回應） -----
  // 使用 previously 計算的 rightCharX 與 leftCharX 作為參考位置
  // 預設先隱藏輸入與按鈕（當靠近左側角色時才顯示）
  try { inputAnswer.hide(); btnSubmit.hide(); btnNext.hide(); } catch (e) { }
  push();
  textSize(16);
  textAlign(LEFT, CENTER);
  fill(0);

  // 右側對話框（改為顯示於左側角色上方，當靠近角色2 時顯示題目）
  // 我們把題目顯示條件改為靠近左側角色（character2）並把對話框放在該角色正上方
  if (leftCharX !== null) {
    // 把題目顯示在角色2 身邊（左或右側視需求，此處放在角色左側旁邊）
    const bw = 300;
    const bh = 90;
    const marginY = 12;
    const by = basePosY - (leftCharDisplayHeight / 2) - (bh / 2) - marginY;

    // 判斷是否靠近左側角色（character2）並計算 leftChar 顯示寬度，以便把題目框放在角色旁邊
    let showQuestion = false;
    let dwL_idle2 = 0;
    const lcCheck = sprites.leftChar;
    if (lcCheck && lcCheck.img && lcCheck.img.width) {
      const swL_idle2 = lcCheck.frameW;
      const shL_idle2 = lcCheck.frameH;
      const maxScaleL_idle2 = Math.min((width * 0.15) / swL_idle2, (height * 0.15) / shL_idle2, 1);
      dwL_idle2 = swL_idle2 * maxScaleL_idle2;
      const distL = Math.abs(posX - leftCharX);
      const proximityThresholdL = dw / 2 + dwL_idle2 / 2 + 80;
      showQuestion = distL <= proximityThresholdL;
    } else {
      showQuestion = Math.abs(posX - leftCharX) <= 220;
    }
  // 將題目框放在角色2 左側靠近的位置，並向右微移 1/8 畫布寬度
  const gap = 12; // 與角色之間的間距
  // 原先向右偏移 1/8 畫布，現在再往右多偏移 1/8（總共 1/4）
  const bx = leftCharX - (dwL_idle2 / 2) - (bw / 2) - gap + (width * 0.25);

    push();
    if (showQuestion && !gameOver) {
      drawComicBubble(bx, by, bw, bh, leftCharX);

      textAlign(LEFT, TOP);
      noStroke();
      fill(0);
      text(dialogStateText || (currentQ ? currentQ.question : '載入題庫中...'), bx - bw / 2 + 10, by - bh / 2 + 10, bw - 20, bh - 20);
      // 當靠近左側角色時，將作答輸入區顯示在角色一 (player) 上方
      try {
        const rect = cnv.elt.getBoundingClientRect();
        const inputW = 140; // 與 setup 中設定相同
        const inputHOffset = 60; // 往上偏移量
        // 計算輸入欄要放的位置（置中於 player 的 X，並靠近 player 頭上方）
        const ix = Math.round(rect.left + (posX - inputW / 2));
        const iy = Math.round(rect.top + (posY - (dh / 2) - inputHOffset));
        inputAnswer.position(ix, iy);
        btnSubmit.position(ix + inputW + 8, iy);
        btnNext.position(ix + inputW + 8 + 72, iy);
        inputAnswer.show();
        btnSubmit.show();
        btnNext.show();
      } catch (err) {
        // 若定位失敗（例如 cnv 未就緒），不用處理
      }
    }
    pop();
  }

  pop();

  // 右側題目顯示（當靠近角色3 時，角色3 顯示題目或回饋）
  if (rightCharX !== null) {
    const bwR = 300;
    const bhR = 90;
    const marginYR = 12;
    const byR = basePosY - (rightCharDisplayHeight / 2) - (bhR / 2) - marginYR;

    // 判斷是否靠近右側角色
    let showQuestionR = false;
    const rcCheck = sprites.rightChar;
    let dwR_idle_check = 0;
    if (rcCheck && rcCheck.img && rcCheck.img.width) {
      const swR_idle2 = rcCheck.frameW;
      const shR_idle2 = rcCheck.frameH;
      const maxScaleR_idle2 = Math.min((width * 0.12) / swR_idle2, (height * 0.12) / shR_idle2, 1);
      dwR_idle_check = swR_idle2 * maxScaleR_idle2;
      const distR = Math.abs(posX - rightCharX);
      const proximityThresholdR = dw / 2 + dwR_idle_check / 2 + 80;
      showQuestionR = distR <= proximityThresholdR;
    } else {
      showQuestionR = Math.abs(posX - rightCharX) <= 220;
    }

  // 將題目框放在角色3 的右側：由角色 X 向右偏移角色顯示寬度/2 + 題目寬度/2 + gap
  const gapR = 12;
  const bxCandidate = rightCharX + (dwR_idle_check / 2 || 0) + (bwR / 2) + gapR;
  // 避免超出畫面邊界
  const bxR = constrain(bxCandidate, bwR / 2, width - bwR / 2);
    push();
    if (showQuestionR && !gameOver) {
      drawComicBubble(bxR, byR, bwR, bhR, rightCharX);

      textAlign(LEFT, TOP);
      noStroke();
      fill(0);
      text(dialogStateTextRight || (currentQ ? currentQ.question : '載入題庫中...'), bxR - bwR / 2 + 10, byR - bhR / 2 + 10, bwR - 20, bhR - 20);
      try {
        const rect = cnv.elt.getBoundingClientRect();
        const inputW = 140;
        const inputHOffset = 60;
        const ix = Math.round(rect.left + (posX - inputW / 2));
        const iy = Math.round(rect.top + (posY - (dh / 2) - inputHOffset));
        inputAnswer.position(ix, iy);
        btnSubmit.position(ix + inputW + 8, iy);
        btnNext.position(ix + inputW + 8 + 72, iy);
        inputAnswer.show();
        btnSubmit.show();
        btnNext.show();
      } catch (err) {
        // ignore
      }
    }
    pop();
  }

  // 限制角色不要移出畫面（以顯示尺寸的一半為邊界）
  const halfW = dw / 2;
  posX = constrain(posX, halfW, width - halfW);

  // 畫出（支援翻轉）
  push();
  translate(posX, posY);
  scale(facing, 1); // 若 facing 為 -1 則水平翻轉
  // 因為已 translate 到中心，image 的位置用 0,0
  image(s.img, 0, 0, dw, dh, sx, sy, sw, sh);
  pop();

  // ----- 遊戲結束畫面 (Overlay) -----
  if (gameOver) {
    // 強制隱藏遊戲介面
    inputAnswer.hide();
    btnSubmit.hide();
    btnNext.hide();

    // 半透明黑底背景
    push();
    rectMode(CENTER);
    fill(0, 150);
    rect(width / 2, height / 2, width, height);

    // 訊息框
    fill(255);
    stroke(0);
    strokeWeight(4);
    rect(width / 2, height / 2, 400, 300, 20);

    // 文字內容
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(32);
    if (gameWon) {
      text("恭喜通關！🎉", width / 2, height / 2 - 50);
      textSize(20);
      text(`你答對了 ${correctCount} 題！`, width / 2, height / 2 + 10);
    } else {
      text("遊戲結束 😢", width / 2, height / 2 - 50);
      textSize(20);
      text("再接再厲！", width / 2, height / 2 + 10);
    }
    pop();

    // 顯示重新開始按鈕
    btnRestart.position(width / 2 - 60, height / 2 + 60);
    btnRestart.show();
  } else {
    btnRestart.hide();
  }
}

// 繪製簡單且合適的背景：漸層天空、太陽、遠山與草地
// drawBackground 已移除（使用統一的純白背景）

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 可選：保持角色垂直中心
  posY = height / 2;
  basePosY = posY;
}

function keyPressed() {
  // 使用 keyPressed 來偵測上鍵的按下（避免重複觸發）
  if (keyCode === UP_ARROW) {
    // 若正處於跳躍中，不重複觸發
    if (!jumping) {
      // 只有在 jump sprite 載入後才啟動跳躍
      const js = sprites['jump'];
      if (js.img && js.img.width) {
        jumping = true;
        jumpProgress = 0;
        frameIndex = 0;
        basePosY = posY; // 記錄起始地面位置
      } else {
        console.warn('跳躍 sprite 尚未載入，無法跳躍');
      }
    }
  }
  // 空白鍵觸發 push 動作
  if (keyCode === 32) {
    if (!pushing) {
      const ps = sprites['push'];
      if (ps.img && ps.img.width) {
        pushing = true;
        pushProgress = 0;
        frameIndex = 0;
        // 推擠期間也可能仍會左右移動
      } else {
        console.warn('push sprite 尚未載入，無法推擠');
      }
    }
  }
}

// 繪製漫畫氣泡（圓角矩形 + 指向角色的箭頭）
function drawComicBubble(x, y, w, h, targetX) {
  push();
  translate(x, y);
  fill(255, 240);
  stroke(0);
  strokeWeight(2);

  let hw = w / 2;
  let hh = h / 2;
  let r = 10;
  let tipX = targetX - x; // 箭頭尖端相對於氣泡中心的 X
  let baseX = constrain(tipX, -hw + 20, hw - 20); // 箭頭根部限制在氣泡內

  beginShape();
  // 上邊
  vertex(-hw + r, -hh);
  vertex(hw - r, -hh);
  quadraticVertex(hw, -hh, hw, -hh + r);
  // 右邊
  vertex(hw, hh - r);
  quadraticVertex(hw, hh, hw - r, hh);
  // 下邊（含箭頭）
  vertex(baseX + 10, hh);
  vertex(tipX, hh + 15); // 箭頭尖端
  vertex(baseX - 10, hh);
  vertex(-hw + r, hh);
  quadraticVertex(-hw, hh, -hw, hh - r);
  // 左邊
  vertex(-hw, -hh + r);
  quadraticVertex(-hw, -hh, -hw + r, -hh);
  endShape(CLOSE);
  pop();
}

// --- 新增：隨機產生 CSV 格式的題庫 ---
function generateRandomQuestions() {
  questionsTable = new p5.Table();
  questionsTable.addColumn('question');
  questionsTable.addColumn('answer');
  questionsTable.addColumn('correct_feedback');
  questionsTable.addColumn('wrong_feedback');
  questionsTable.addColumn('hint');

  for (let i = 0; i < 10; i++) {
    let num1 = floor(random(0, 10));
    let num2 = floor(random(0, 10));
    let ans = num1 + num2;
    
    let newRow = questionsTable.addRow();
    newRow.setString('question', `${num1} + ${num2} = ?`);
    newRow.setString('answer', str(ans));
    newRow.setString('correct_feedback', '太棒了！答對囉！🎉');
    newRow.setString('wrong_feedback', '哎呀，算錯了。再試一次！💪');
    newRow.setString('hint', `提示：試著用手指頭數數看，${num1} 加上 ${num2} 是多少？`);
  }
}

function downloadCSV() {
  if (questionsTable) {
    saveTable(questionsTable, 'math_quiz.csv');
  }
}

function restartGame() {
  correctCount = 0;
  wrongCount = 0;
  gameOver = false;
  gameWon = false;
  btnRestart.hide();
  pickRandomQuestion();
}

// ----- 測驗相關函式 -----
function pickRandomQuestion() {
  dialogStateText = '';
  lastPlayerAnswer = '';
  inputAnswer.value('');
  dialogStateText5 = ''; // 清除提示精靈的文字
  if (questionsTable && questionsTable.getRowCount() > 0) {
    const r = floor(random(questionsTable.getRowCount()));
    const row = questionsTable.getRow(r);
    currentQ = {
      question: row.get('question'),
      answer: row.get('answer'),
      correct_feedback: row.get('correct_feedback'),
      wrong_feedback: row.get('wrong_feedback'),
      hint: row.get('hint')
    };
    dialogStateText = currentQ.question; // 顯示題目在角色 2 的對話框
    dialogStateTextRight = currentQ.question; // 也預設在角色3 顯示題目，靠近才會顯示
  dialogStateText4 = currentQ.question; // 也預設在角色4 顯示題目，靠近才會顯示
    console.log('抽題：', currentQ.question);
  } else {
    // 若尚未載入 CSV，顯示等待訊息
    currentQ = null;
    dialogStateText = '題庫載入中，請稍候...';
  }
}

function submitAnswer() {
  if (!currentQ || gameOver) return;
  const raw = inputAnswer.value().trim();
  lastPlayerAnswer = raw;
  if (raw === '') {
    dialogStateText = '請輸入一個數字答案。';
    dialogStateTextRight = '請輸入一個數字答案。';
    dialogStateText4 = '請輸入一個數字答案。';
    dialogStateText5 = '請輸入數字喔！';
    return;
  }
  // 嘗試用數字比較（允許字串答案，如果 CSV 的 answer 為文字也能比對）
  const userNum = Number(raw);
  const correctNum = Number(currentQ.answer);
  if (!isNaN(userNum) && !isNaN(correctNum)) {
    if (userNum === correctNum) {
      correctCount++;
      dialogStateText = currentQ.correct_feedback;
      // 讓右側角色顯示微笑
      rightCharUsingSmile = true;
      // 角色3 給予讚美回應
      dialogStateTextRight = '太棒了！ ' + (currentQ.correct_feedback || '答對了！');
      // 角色4 給予讚美回應
      dialogStateText4 = '太棒了！ ' + (currentQ.correct_feedback || '答對了！');
      // 角色5 給予讚美
      dialogStateText5 = '太棒了！';
      
      if (correctCount >= WIN_THRESHOLD) {
        gameOver = true;
        gameWon = true;
      } else {
        // 自動在 1.2 秒後抽下一題
        setTimeout(() => {
          rightCharUsingSmile = false;
          pickRandomQuestion();
        }, 1200);
      }
    } else {
      wrongCount++;
      if (wrongCount >= LOSE_THRESHOLD) {
        gameOver = true;
        gameWon = false;
      }
      dialogStateText = currentQ.wrong_feedback;
      // 角色3 給予鼓勵回應
      dialogStateTextRight = '加油！ ' + (currentQ.wrong_feedback || '再試一次！');
      // 角色4 給予鼓勵回應
      dialogStateText4 = '加油！ ' + (currentQ.wrong_feedback || '再試一次！');
      // 角色5 顯示提示（題目中的 hint 欄位）
      dialogStateText5 = currentQ.hint || '加油！';
    }
  } else {
    // 非數字比對，直接字串比對
    if (raw === currentQ.answer) {
      correctCount++;
      dialogStateText = currentQ.correct_feedback;
      dialogStateTextRight = '太棒了！ ' + (currentQ.correct_feedback || '答對了！');
      dialogStateText4 = '太棒了！ ' + (currentQ.correct_feedback || '答對了！');
      dialogStateText5 = '太棒了！';
      
      if (correctCount >= WIN_THRESHOLD) {
        gameOver = true;
        gameWon = true;
      } else {
        setTimeout(() => {
          pickRandomQuestion();
        }, 1200);
      }
    } else {
      wrongCount++;
      if (wrongCount >= LOSE_THRESHOLD) {
        gameOver = true;
        gameWon = false;
      }
      dialogStateText = currentQ.wrong_feedback;
      dialogStateTextRight = '加油！ ' + (currentQ.wrong_feedback || '再試一次！');
      dialogStateText4 = '加油！ ' + (currentQ.wrong_feedback || '再試一次！');
      dialogStateText5 = currentQ.hint || '加油！';
    }
  }
}
