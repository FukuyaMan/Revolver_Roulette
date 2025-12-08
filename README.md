# Russian Roulette Game - Technical Demo

Reactで実装されたロシアンルーレットゲームの技術検証デモです。

## 必要要件 (Prerequisites)
- Node.js (v18以上推奨)
- npm

## セットアップと実行 (Setup & Run)

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. 開発サーバーの起動:
   ```bash
   npm run dev
   ```

3. ブラウザで確認:
   ターミナルに表示されるURL（例: `http://localhost:5173`）を開いてください。

## ゲームの遊び方
1. **Selection Phase**: `Load Gun`を選んで装填フェーズへ。
2. **Loading Phase**: `Start Loading`を押し、スライダーを右端まで動かして弾を込めます。
3. **Selection Phase**: `Go to Fire Phase`で発砲フェーズへ。
4. **Firing Phase**: `FIRE`ボタンを押して運試しをします。
   - 空砲なら次の弾へ。
   - 実弾ならゲームオーバー。
5. **Debug Info**: 画面下部にデバッグ情報（実弾の位置など）が表示されています。
