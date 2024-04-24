//=============================================================================
// ゲームメニューコマンドウィンドウ見た目変更プラグイン
// EXC_GameMenuFromPicture.js
// ----------------------------------------------------------------------------
// Copyright (c) 2024 IdiotException
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.0.0 2024-04-20 初版
//=============================================================================
/*:ja
 * @target MZ
 * @plugindesc メニュー画面の選択リストを画像をもとに作成します
 * @author IdiotException
 * @url https://github.com/IdiotException/EXC_GameMenuFromPicture
 * @help メニューの選択肢リストの見た目を画像に置き換えることができます。
 * 実際には元のリストは画面外に配置されており、実動作はそちらに依存します。
 * 
 * 選択したものと動作が一致しない等の確認の際にはデバッグ設定をtrueにしてみて
 * 表示側と元のリストの選択状態や動作が一致することを確認してみてください。
 * 
 * 選択肢画像と位置の番号は何番目の選択肢かというゲーム内での順番に対応します。
 * 
 * "使用不可時、使用不可かつ選択時"の画像については
 * 使用不可(禁止状態)にならない選択肢には設定不要です。
 * 
 * 右側基準の0位置は右上ボタンの右端の位置になります。
 * 
 * 画像自体の当たり判定には透過部分も含まれます。
 * 
 * 画像同士（透過部分も含め）が重なる場合、想定通りの動作とならない場合があります。
 * 
 * 利用規約
 *   MITライセンスです。
 *   作者に無断で改変、再配布が可能で、
 *   利用形態（商用、18禁利用等）についても制限はありません。
 * 
 * @param Debug
 * @text デバッグ用設定
 * @desc デフォルトのコマンドウィンドウを表示するか
 * @type boolean
 * @default true
 * 
 * @param MaxCols
 * @text リストの列数
 * @desc メニューのリストの横に並ぶ項目数の最大
 * @type Number
 * @default 1
 * @min 1
 * 
 * @param BackgroundPicture
 * @text 追加背景画像
 * @desc 追加で表示するメニューの背景となる画像
 * @type file
 * @dir img
 * 
 * @param BackgroundPositions
 * @text 追加背景位置
 * @desc 追加で表示するメニューの背景の位置指定
 * @type struct<Positions>
 * 
 * @param MenuItemsPictures
 * @text メニュー選択肢画像
 * @desc メニューの選択肢のそれぞれの画像
 * 上から指定したものがメニューのリストの上から対応する
 * @type struct<MenuItem>[]
 * 
 * @param MenuItemsPositions
 * @text メニュー選択肢位置
 * @desc メニューの選択肢のそれぞれの表示位置
 * @type struct<Positions>[]
 */
 /*~struct~Positions:
 * 
 * @param x
 * @text x座標
 * @desc x軸座標
 * 画面右端から画像右、または画面左端から画像左の距離
 * @type number
 * @defalft 0
 * 
 * @param AnchorX
 * @text x基準
 * @desc x座標の基準
 * 右からの距離で指定するか、左からか
 * @type select
 * @option 左
 * @option 右
 * @default 左
 * 
 * @param y
 * @text y座標
 * @desc y軸座標
 * 上側基準位置からの距離
 * @type number
 * @defalft 0
 * 
 * @param BaseY
 * @text yの基準
 * @desc yの基準位置を上部の操作ボタンの下にするか
 * する/ON/true or しない(画面上端基準)/OFF/false
 * @type boolean
 * @default true
 */ 
 /*~struct~MenuItem:
 *
 * @param Default
 * @text 通常時
 * @desc 通常時（非選択時）の画像
 * @type file
 * @dir img
 * 
 * @param Selected
 * @text 選択時
 * @desc 選択時の画像
 * @type file
 * @dir img
 * 
 * @param Disable
 * @text 使用不可時
 * @desc 使用不可時の画像
 * @type file
 * @dir img
 * 
 * @param DisableSelected
 * @text 使用不可かつ選択時
 * @desc 使用不可で選択時の画像
 * @type file
 * @dir img
 */
const EXCGameMenuFromPicture = document.currentScript.src.match(/^.*\/(.+)\.js$/)[1];

(function() {
	"use strict";
	//--------------------------------------------------
	// 定数設定
	//--------------------------------------------------

	// 画像素材の名前
	const IMG_FOLDER	= "img/";		// 画像ファイル格納フォルダ

	// 内部で利用する定数
	// メニューアイテムの状態管理
	const MenuSelected = {
		default		: 0,
		selected	: 1,
		disable		: 2,
		disableSel	: 3
	};

	//パラメータ受取処理
	const parameters = PluginManager.parameters(EXCGameMenuFromPicture);
	const _isDebug		= (parameters.Debug == "true");
	const _maxCols		= Number(parameters.MaxCols || 1);
	const _backPict		= String(parameters.BackgroundPicture || "");
	const _backPictPos	= JSON.parse(parameters.BackgroundPositions || "[]");
	const _tempItemPicts	= JSON.parse(parameters.MenuItemsPictures || "[]");
	let _menuItemPict = [];
	_tempItemPicts.forEach(el => _menuItemPict.push(JSON.parse(el)));
	const _tempItemPos	= JSON.parse(parameters.MenuItemsPositions || "[]");
	let _menuItemPos = [];
	_tempItemPos.forEach(el => _menuItemPos.push(JSON.parse(el)));


	// 画像用Bitmapの保持
	let _bmpBackPict, _bmpMenuItems;

	// メニュー一覧の選択肢の保持
	let _mitMenuItems;

	// コマンドウィンドウの保持
	let _cmdwinMenuItems;

	// メニュー選択肢の状態保持
	let _beforeSelectedIndex = -1;

	//--------------------------------------------------
	// Scene_Menu のオーバーライド
	//--------------------------------------------------
	const _EXC_Scene_Menu_create = Scene_Menu.prototype.create;
	Scene_Menu.prototype.create = function() {
		// デフォルトの処理を実行
		_EXC_Scene_Menu_create.call(this);
		// コマンドウィンドウ本体を保持
		_cmdwinMenuItems = this._commandWindow;
		// 画像読み込み
		this.loadImageBitmap();
		// 見た目側の選択肢をセット
		this.createMenuItem();
	};


	// コマンドウィンドウ本体を画面外左側に移動
	const _EXC_Scene_Menu_commandWindowRect = Scene_Menu.prototype.commandWindowRect;
	Scene_Menu.prototype.commandWindowRect = function() {
		let rect = _EXC_Scene_Menu_commandWindowRect.call(this);

		if(!_isDebug){
			// 画面外に移動(念のため少し多めに飛ばす)
			rect.x = - rect.width - 20;
		}
		return rect;
	};


	//--------------------------------------------------
	// Scene_Menu への追加
	//--------------------------------------------------
	// 画像準備
	Scene_Menu.prototype.loadImageBitmap = function() {

		// メニュー背景の読み込み
		if(_backPict){
			_bmpBackPict = ImageManager.loadBitmap(IMG_FOLDER, _backPict);
		}

		// メニュー部品の読み込み
		_bmpMenuItems = [];
		for(let i = 0; i < _menuItemPict.length; i++) {
			if(!_menuItemPict[i] || !_menuItemPict[i].Default || !_menuItemPict[i].Selected){
				// 部品の読み込みに問題がある場合そのまま終わる
				break;
			}
			// 各画像を読み込み
			let tmpMenuItems = [];
			tmpMenuItems.push(ImageManager.loadBitmap(IMG_FOLDER, _menuItemPict[i].Default));
			tmpMenuItems.push(ImageManager.loadBitmap(IMG_FOLDER, _menuItemPict[i].Selected));
			if(_menuItemPict[i].Disable && _menuItemPict[i].DisableSelected){
				tmpMenuItems.push(ImageManager.loadBitmap(IMG_FOLDER, _menuItemPict[i].Disable));
				tmpMenuItems.push(ImageManager.loadBitmap(IMG_FOLDER, _menuItemPict[i].DisableSelected));
			}
			_bmpMenuItems.push(tmpMenuItems);
		}
	};

	// メニューの要素の設定
	Scene_Menu.prototype.createMenuItem = function() {

		// メニュー背景を設定
		if(_backPict){
			this.setSpritePosition(new Sprite(_bmpBackPict), _backPictPos);
		}

		// メニュー選択項目の設定
		_mitMenuItems = [];
		for(let i = 0; i < _menuItemPos.length; i++) {
			let tmpMenuItem = new EXC_MenuItem();
			if(this._commandWindow.isCommandEnabled(i)){
				tmpMenuItem.bitmap = _bmpMenuItems[i][MenuSelected.default];
			} else {
				tmpMenuItem.bitmap = _bmpMenuItems[i][MenuSelected.disable];
			}
			tmpMenuItem = this.setSpritePosition(tmpMenuItem, _menuItemPos[i]);
			tmpMenuItem.setIndex(i);
			_mitMenuItems.push(tmpMenuItem);
			this.addChild(tmpMenuItem);
		}
	};

	// スプライトに位置を設定
	Scene_Menu.prototype.setSpritePosition = function(obj, pos) {
		let tempX = 0;
		let tempAnchor = 0;
		if(pos.AnchorX == "左"){
			// 左基準
			tempX = Number(pos.x || 0);
		} else {
			// 右基準
			tempX = Graphics.boxWidth - Number(pos.x || 0);
			tempAnchor = 1;
		}
		let tempY = Number(pos.y || 0);
		if(pos.BaseY == "true"){
			tempY += this.mainAreaTop();
		}
		obj.x = tempX;
		obj.y = tempY;
		obj.anchor.x = tempAnchor;
		this.addChild(obj);
		return obj;
	};

	// 画面更新処理
	Scene_Menu.prototype.update = function() {
		Scene_MenuBase.prototype.update.call(this);
		let currentIndex = this._commandWindow.index();

		// 現在の対象が選択状態になっていない場合
		if(_mitMenuItems[currentIndex] && 
				_mitMenuItems[currentIndex].bitmap != _bmpMenuItems[currentIndex][MenuSelected.selected] &&
					_mitMenuItems[currentIndex].bitmap != _bmpMenuItems[currentIndex][MenuSelected.disableSel]){
			// 初回のみ前がないためスキップ
			if(_beforeSelectedIndex >= 0 && _mitMenuItems[_beforeSelectedIndex]){
				// 非選択になったものを非選択画像に差し替え
				if(this._commandWindow.isCommandEnabled(_beforeSelectedIndex)){
					_mitMenuItems[_beforeSelectedIndex].bitmap = _bmpMenuItems[_beforeSelectedIndex][MenuSelected.default];
				}else {
					_mitMenuItems[_beforeSelectedIndex].bitmap = _bmpMenuItems[_beforeSelectedIndex][MenuSelected.disable];
				}
			}
			// 選択されたものを選択画像に差し替え
			if(this._commandWindow.isCommandEnabled(currentIndex)){
				_mitMenuItems[currentIndex].bitmap = _bmpMenuItems[currentIndex][MenuSelected.selected];
			} else {
				_mitMenuItems[currentIndex].bitmap = _bmpMenuItems[currentIndex][MenuSelected.disableSel];
			}

			// 現在選択を保持
			_beforeSelectedIndex = currentIndex;
		}
	};


	//--------------------------------------------------
	// Window_MenuCommand のオーバーライド
	//--------------------------------------------------
	Window_MenuCommand.prototype.maxCols = function() {
		return _maxCols;
	};

	//-----------------------------------------------------------------------------
	// EXC_MenuItem
	// Sprite_Clickableをもとに作成
	//

	function EXC_MenuItem() {
		this.initialize.apply(this, arguments);
	}

	EXC_MenuItem.prototype = Object.create(Sprite_Clickable.prototype);
	EXC_MenuItem.prototype.constructor = EXC_MenuItem;

	EXC_MenuItem.prototype.initialize = function() {
		Sprite_Clickable.prototype.initialize.call(this);
	};

	// リスト上でのインデックスを保持
	EXC_MenuItem.prototype.setIndex = function(index) {
		this._index = index;
	};

	// マウスオーバーを実体側リストに反映
	EXC_MenuItem.prototype.onMouseEnter = function() {
		if(_cmdwinMenuItems.isOpenAndActive()){
			_cmdwinMenuItems.select(this._index);
		}
	};

	// メニュークリック時のイベント処理
	EXC_MenuItem.prototype.onClick = function() {
		if(_cmdwinMenuItems.isOpenAndActive()){
			_cmdwinMenuItems.processOk();
		}
	};

})();

