import { State } from '../game-state.js';
import { getMessage } from '../../narrative/script-data.js';
import { getLanguage } from '../../data/i18n.js';

const SENDER_NAMES = {
  boss: { ko: '채 실장', en: 'Director Chae' },
  bank: { ko: 'KH은행', en: 'KH Bank' },
  sys:  { ko: 'REVAN 공문', en: 'Revan Directive' },
};

/**
 * Phone overlay — slide-up sheet with the message thread + wallet card.
 * Messages arrive via receive(); a HUD badge pulses until read.
 */
export class PhoneOverlay {
  constructor(overlayManager, gameState) {
    this.om = overlayManager;
    this.gameState = gameState;

    this.el = document.getElementById('phone-overlay');
    this.threadEl = document.getElementById('phone-thread');
    this.repliesEl = document.getElementById('phone-replies');
    this.walletEl = document.getElementById('phone-wallet');
    this.walletBalanceEl = document.getElementById('phone-wallet-balance');
    this.badge = document.getElementById('phone-badge');
    this.badgeCount = document.getElementById('phone-badge-count');

    this.thread = [];        // { sender, text } | { me:true, text }
    this.unread = 0;
    this.walletVisible = false;
    this._pendingReplies = null;
    this._walletAnim = null;
    this.onReply = null;     // (messageId, replyIndex, reply) => {}
    this.audioCue = null;    // () => {} set by main

    this.badge.addEventListener('click', () => this.openSheet());
    document.getElementById('phone-close').addEventListener('click', () => this.closeSheet());
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.closeSheet();
    });
  }

  showBadge() {
    this.badge.style.display = 'flex';
  }

  /** A message arrives (by MESSENGER_SCRIPT id). */
  receive(messageId) {
    const msg = getMessage(messageId, getLanguage(), this.gameState);
    if (!msg) return;
    this.thread.push({ id: msg.id, sender: msg.sender, text: msg.text, replies: msg.replies });
    this.unread++;
    this._updateBadge();
    this._showBanner(msg);
    if (this.audioCue) this.audioCue();
  }

  /** Prominent arrival banner — tap (mobile) or press Q (desktop) to read. */
  _showBanner(msg) {
    if (this.om.isOpen && this.om.current && this.om.current.el === this.el) return; // sheet already open
    const lang = getLanguage();
    const old = document.getElementById('msg-banner');
    if (old) old.remove();

    const banner = document.createElement('div');
    banner.id = 'msg-banner';
    const name = SENDER_NAMES[msg.sender];
    const isTouch = 'ontouchstart' in window && window.innerWidth < 1024;
    banner.innerHTML = `
      <div class="banner-sender">✉ ${name ? (name[lang] || name.ko) : msg.sender}</div>
      <div class="banner-preview"></div>
      <div class="banner-hint">${isTouch
        ? (lang === 'ko' ? '탭하여 확인' : 'Tap to read')
        : (lang === 'ko' ? '[Q] 눌러서 확인' : 'Press [Q] to read')}</div>`;
    banner.querySelector('.banner-preview').textContent =
      msg.text.length > 48 ? msg.text.slice(0, 48) + '…' : msg.text;

    const open = (e) => { e.preventDefault(); banner.remove(); this.openSheet(); };
    banner.addEventListener('click', open);
    banner.addEventListener('touchend', open);
    document.body.appendChild(banner);

    setTimeout(() => {
      banner.classList.add('banner-gone');
      setTimeout(() => banner.remove(), 900);
    }, 6500);
  }

  /** Player's own bubble (reply echo). */
  pushMine(text) {
    this.thread.push({ me: true, text });
    this._renderThread();
  }

  setWallet(balance, { animateFrom = null } = {}) {
    this.walletVisible = true;
    this.walletEl.style.display = 'block';
    if (animateFrom !== null) {
      this._animateWallet(animateFrom, balance);
    } else {
      this.walletBalanceEl.textContent = this._formatWon(balance);
    }
    this.gameState.walletBalance = balance;
  }

  _animateWallet(from, to) {
    const start = performance.now();
    const dur = 1600;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(from + (to - from) * eased);
      this.walletBalanceEl.textContent = this._formatWon(val);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _formatWon(n) {
    return '₩' + n.toLocaleString('ko-KR');
  }

  openSheet() {
    if (this.om.isOpen) return;
    const banner = document.getElementById('msg-banner');
    if (banner) banner.remove();
    this.unread = 0;
    this._updateBadge();
    this._renderThread();
    this.om.open(this.el, State.PHONE);
    // _renderThread ran while the sheet was display:none (scrollHeight 0) —
    // jump to the newest message once layout exists
    requestAnimationFrame(() => {
      this.threadEl.scrollTop = this.threadEl.scrollHeight;
    });
    this.gameState.emit('phoneOpened', {});
  }

  closeSheet() {
    if (this.om.current && this.om.current.el === this.el) {
      this.om.close();
    }
  }

  _updateBadge() {
    if (this.unread > 0) {
      this.badge.classList.remove('has-unread');
      void this.badge.offsetWidth; // restart buzz animation
      this.badge.classList.add('has-unread');
      this.badgeCount.textContent = this.unread;
    } else {
      this.badge.classList.remove('has-unread');
    }
  }

  _renderThread() {
    const lang = getLanguage();
    this.threadEl.innerHTML = '';
    this.repliesEl.innerHTML = '';

    for (const msg of this.thread) {
      const div = document.createElement('div');
      if (msg.me) {
        div.className = 'phone-msg from-me';
        div.textContent = msg.text;
      } else {
        div.className = msg.sender === 'sys' ? 'phone-msg from-them sys-msg' : 'phone-msg from-them';
        const sender = document.createElement('span');
        sender.className = 'msg-sender';
        const name = SENDER_NAMES[msg.sender];
        sender.textContent = name ? (name[lang] || name.ko) : msg.sender;
        div.appendChild(sender);
        div.appendChild(document.createTextNode(msg.text));
      }
      this.threadEl.appendChild(div);
    }

    // Latest message with replies still pending?
    const last = this.thread[this.thread.length - 1];
    if (last && !last.me && last.replies && !last.replied) {
      last.replies.forEach((reply, idx) => {
        const btn = document.createElement('button');
        btn.textContent = reply.text[lang] || reply.text.ko;
        btn.addEventListener('click', () => {
          last.replied = true;
          if (reply.suspicionDelta) this.gameState.suspicion += reply.suspicionDelta;
          this.pushMine(reply.text[lang] || reply.text.ko);
          this.repliesEl.innerHTML = '';
          if (this.onReply) this.onReply(last.id, idx, reply);
        });
        this.repliesEl.appendChild(btn);
      });
    }

    this.threadEl.scrollTop = this.threadEl.scrollHeight;
  }
}
