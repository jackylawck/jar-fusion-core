const GameController = {
  hasDisrupted: false,

  init(camera) {
    this.camera = camera;
    AudioSys.init();
  },

  // 每幀更新協調：監聽物理狀態並觸發相應的音訊與相機同步
  update(st, now, coilMeshes) {
    // 1. 同步相機與 3D 聽眾
    AudioSys.updateListener(this.camera);

    // 2. 驅動分層環境音景
    AudioSys.updateSoundscape(st);

    // 3. 點火狀態判定與音樂觸發
    if (st.qGain >= 1.0) {
      AudioSys.playIgnitionFanfare();
    } else if (st.qGain < 0.8) {
      AudioSys.isIgnited = false;
    }

    // 4. ELM 邊緣爆發音效
    if (st.elmBurst) {
      AudioSys.playTone(320, 'sawtooth', 0.12, 0.09);
    }

    // 5. 大破裂重大事故音效
    if (st.gameOver && !this.hasDisrupted) {
      this.hasDisrupted = true;
      AudioSys.playDisruptionBurst();
    }

    // 6. 3D 空間故障線圈警報調度
    if (st.failingCoilIndex !== -1 && coilMeshes) {
      const failedMesh = coilMeshes[st.failingCoilIndex];
      const severity = Math.min(1.0, st.kinkDistortion * 0.5 + Math.max(0, st.tempE0 - 18) * 0.04);
      const alertInterval = (0.85 - severity * 0.67) * 1000;

      if (now - AudioSys.lastAlertTime > alertInterval) {
        AudioSys.lastAlertTime = now;
        const coilWorldPos = new THREE.Vector3();
        failedMesh.getWorldPosition(coilWorldPos);
        AudioSys.playDirectionalCoilAlert(coilWorldPos, severity);
      }
    }
  },

  // 玩家操作介面
  injectPellet() {
    FusionPhysics.injectPellet();
    AudioSys.playTone(650, 'triangle', 0.08, 0.08);
  },

  purgeDivertor() {
    FusionPhysics.purgeDivertor();
    AudioSys.playTone(200, 'sine', 0.25, 0.1);
  },

  repairCoil(index) {
    FusionPhysics.repairCoil(index);
    AudioSys.playTone(920, 'square', 0.18, 0.08);
  },

  triggerWelding() {
    AudioSys.playRepairWelding();
  }
};
