// 在 UI 物件中追加教學引導與成就通知方法：
showAchievementToast(title) {
  let toast = document.getElementById('achievement-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'achievement-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<div class="achieve-title">${title}</div>`;
  toast.className = 'achieve-show';
  setTimeout(() => { toast.className = 'achieve-hide'; }, 4500);
},

showTutorialStep(stepIndex) {
  if (CareerManager.data.tutorialPassed) return;
  const isZh = I18N.currentLang === 'zh';
  let guide = document.getElementById('tutorial-guide');
  if (!guide) {
    guide = document.createElement('div');
    guide.id = 'tutorial-guide';
    document.getElementById('ui-layer').appendChild(guide);
  }

  const steps = [
    {
      title: isZh ? '第一步：啟動主電源' : 'Step 1: Turn On Master Power',
      desc: isZh ? '點擊底部綠色按鈕開啟反應爐，等離子體將開始注入。' : 'Click the green power button below to energize the core.',
      target: 'btn-power'
    },
    {
      title: isZh ? '第二步：提升微波加熱' : 'Step 2: Increase ECRH Heating',
      desc: isZh ? '將 P_ECRH 滑塊調高至 15 MW 以上，觀察核心溫度攀升。' : 'Slide P_ECRH above 15 MW and watch electron temperature soar.',
      target: 'slider-heat-ecrh'
    },
    {
      title: isZh ? '第三步：維持能量點火' : 'Step 3: Sustain Fusion Breakeven',
      desc: isZh ? '當能量增益 Q ≥ 1.0 時即達成點火！若過熱請開啟偏濾器排氣。' : 'Achieve ignition when Q ≥ 1.0! Purge divertor if wall gets too hot.',
      target: 'val-q'
    }
  ];

  if (stepIndex >= steps.length) {
    guide.remove();
    CareerManager.data.tutorialPassed = true;
    CareerManager.save();
    return;
  }

  const s = steps[stepIndex];
  guide.innerHTML = `
    <div class="guide-card">
      <div class="guide-header"><b>💡 ${s.title}</b><span id="btn-skip-guide">跳過 (Skip)</span></div>
      <div class="guide-desc">${s.desc}</div>
      <button id="btn-next-guide" class="btn-guide-action">${isZh ? '下一步' : 'Next'}</button>
    </div>
  `;

  document.getElementById('btn-skip-guide').onclick = () => {
    guide.remove();
    CareerManager.data.tutorialPassed = true;
    CareerManager.save();
  };

  document.getElementById('btn-next-guide').onclick = () => {
    this.showTutorialStep(stepIndex + 1);
  };
}
