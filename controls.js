"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var hexdump = require("hexdump-nodejs");
var fs = require("fs");
var AsyncLock = require('async-lock');
var lock = new AsyncLock();
var wstreamWrite; // = fs.createWriteStream('/tmp/kedei_lcd_in');
var wstreamRead; // = fs.createReadStream('/tmp/kedei_lcd_out');
var AllControls = Array();
var GlobalEventCounter = 1;
function init(outStreamPath, inStreamPath) {
    var _this = this;
    var eventReseiveHeaderLen = 12;
    var readTimeoutMs = 5000;
    /**
     * 0 - idle or waiting event header
     * 1 - waiting event header
     * 2 - waiting additional
     */
    var readEventStage = 0;
    var curEvent;
    var addDataLen;
    var startTime;
    wstreamRead = fs.createReadStream(inStreamPath);
    wstreamWrite = fs.createWriteStream(outStreamPath);
    wstreamRead.on('readable', function () {
        //console.log('readable paused = ' + wstreamRead.isPaused());
        switch (readEventStage) {
            case 0:
                //console.log("readEventStage = 0!");
                _this.startTime = (new Date).getTime();
            case 1:
                {
                    //console.log("readEventStage = 1!");
                    var rrr = wstreamRead.read(eventReseiveHeaderLen);
                    if (rrr === null) {
                        var curMs = (new Date).getTime();
                        console.log("startMs = " + _this.startTime + ", curMs = " + curMs + ", diff = " + (curMs - _this.startTime));
                        if ((curMs - _this.startTime) > readTimeoutMs) {
                            console.log("Timeout!");
                            var rd = wstreamRead.read();
                            if (rd !== null) {
                                console.log("Left in stream: " + rd.length);
                                console.log(hexdump(rd));
                            }
                            readEventStage = 0;
                        }
                        return;
                    }
                    var buffer = new ArrayBuffer(eventReseiveHeaderLen);
                    var uint8 = new Uint8Array(buffer);
                    //console.log("Read " + rrr.length + " bytes");
                    //console.log(hexdump(rrr));
                    var uint8 = new Uint8Array(buffer);
                    uint8.set(rrr, 0);
                    var vId = new DataView(buffer);
                    var namebuf = buffer.slice(6, 10);
                    _this.addDataLen = vId.getUint16(10, true);
                    // curEvent.eventId = vId.getUint32(0, true);
                    // curEvent.controlId = vId.getUint16(4, true);
                    // //console.log("Buffer.from(buffer, 6, 4)");
                    // //console.log(hexdump(namebuf));
                    // curEvent.name = Buffer.from(namebuf).toString('ascii');
                    // curEvent.additional = null;
                    curEvent = new EventData(vId.getUint32(0, true), vId.getUint16(4, true), Buffer.from(namebuf).toString('ascii'), null);
                    if (_this.addDataLen == 0) {
                        readEventStage = 0;
                        processEvent(curEvent);
                        return;
                    }
                    else {
                        _this.startTime = (new Date).getTime();
                        readEventStage = 2;
                        return;
                    }
                }
            case 2:
                {
                    //console.log("readEventStage = 2! waiting for " + this.addDataLen + " bytes...");
                    var addRrr = wstreamRead.read(_this.addDataLen);
                    if (addRrr === null) {
                        var curMs = (new Date).getTime();
                        console.log("startMs = " + _this.startTime + ", curMs = " + curMs + ", diff = " + (curMs - _this.startTime));
                        if ((curMs - _this.startTime) > readTimeoutMs) {
                            console.log("Timeout!");
                            var rd = wstreamRead.read();
                            if (rd !== null) {
                                console.log("Left in stream: " + rd.length);
                                console.log(hexdump(rd));
                            }
                            readEventStage = 0;
                            return;
                        }
                        return;
                    }
                    var addBuffer = new ArrayBuffer(_this.addDataLen);
                    var addUint8 = new Uint8Array(addBuffer);
                    /*if(addRrr == null)
                    {
                        console.log("Read additional data = null");
                    }
                    else
                    {
                        console.log("Read additional data " + addRrr.length);
                    }*/
                    addUint8.set(addRrr, 0);
                    curEvent.additional = addBuffer;
                    readEventStage = 0;
                    processEvent(curEvent);
                }
                break;
        }
    });
}
exports.init = init;
var EventData = /** @class */ (function () {
    function EventData(eventId, controlId, name, additional) {
        this.eventId = eventId;
        this.controlId = controlId;
        this.name = name;
        this.additional = additional;
    }
    EventData.prototype.dump = function () {
        var addBytes = 0;
        if (this.additional !== null) {
            addBytes = this.additional.byteLength;
        }
        console.log("EventData: eventId = " + this.eventId + ", controlId = " + this.controlId + ", name = '" + this.name + "', additional = " + addBytes);
    };
    return EventData;
}());
exports.EventData = EventData;
var TouchEventData = /** @class */ (function (_super) {
    __extends(TouchEventData, _super);
    function TouchEventData(eventData) {
        var _this = _super.call(this, eventData.eventId, eventData.controlId, eventData.name, eventData.additional) || this;
        if (eventData.additional == null || eventData.additional.byteLength < 4) {
            new Error("Touch event additional length error!");
            return _this;
        }
        var vId = new DataView(eventData.additional);
        _this._x = vId.getUint16(0, true);
        _this._y = vId.getUint16(2, true);
        console.log("Touch x = " + _this._x + ", y = " + _this._y);
        return _this;
    }
    Object.defineProperty(TouchEventData.prototype, "x", {
        get: function () {
            return this._x;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TouchEventData.prototype, "y", {
        get: function () {
            return this._y;
        },
        enumerable: true,
        configurable: true
    });
    return TouchEventData;
}(EventData));
function processEvent(curEvent) {
    //curEvent.dump();
    var processedEvent;
    if (curEvent.name == 'toch') // touch
     {
        processedEvent = new TouchEventData(curEvent);
    }
    if (processedEvent == null) {
        console.error("Error processing event!");
        return;
    }
    if (curEvent.controlId == 0) {
        return;
    }
    var control = AllControls[curEvent.controlId];
    if (control == null) {
        console.error("Control id " + curEvent.controlId + " not found!");
        return;
    }
    control.doEvent(processedEvent);
}
exports.processEvent = processEvent;
function getGlobalEventId() {
    var retVal;
    // Promise mode
    lock.acquire(GlobalEventCounter, function () {
        // return value or promise
        GlobalEventCounter++;
        retVal = GlobalEventCounter;
    }).then(function () {
        // lock released
    });
    return retVal;
}
function strToBytes(str) {
    var arr = [];
    for (var i = 0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80)
            arr.push(charcode);
    }
    return Uint8Array.from(arr);
}
var Command = /** @class */ (function () {
    function Command() {
    }
    /*constructor(wstreamWrite: fs.WriteStream)
    {
        this._wstreamWrite = wstreamWrite;
    }*/
    Command.prototype.getCommandBytes = function () {
        console.log("Command getCreateBytes");
        return null;
    };
    Object.defineProperty(Command.prototype, "eventId", {
        get: function () {
            return this._eventId;
        },
        enumerable: true,
        configurable: true
    });
    Command.prototype.sendBytes = function (event_id, bytes) {
        var buffer = new ArrayBuffer(4);
        var vId = new DataView(buffer);
        vId.setUint32(0, event_id, true);
        var buff = Buffer.from(buffer);
        console.log("sending event id = " + event_id + " ... ");
        wstreamWrite.write(buff);
        if (bytes == null) {
            console.error("Bytes - null!");
            return;
        }
        buff = Buffer.from(bytes);
        console.log(hexdump(buff));
        wstreamWrite.write(buff);
    };
    Command.prototype.sendEvent = function (bytes) {
        this._eventId = getGlobalEventId();
        this.sendBytes(this._eventId, bytes);
        return this._eventId;
    };
    Command.prototype.send = function () {
        this.sendEvent(this.getCommandBytes());
    };
    return Command;
}());
var ClearAllControls = /** @class */ (function (_super) {
    __extends(ClearAllControls, _super);
    function ClearAllControls() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ClearAllControls.prototype.getCommandBytes = function () {
        var buffer = new ArrayBuffer(4);
        var uint8 = new Uint8Array(buffer);
        uint8.set(strToBytes("ddac"));
        return buffer;
    };
    return ClearAllControls;
}(Command));
exports.ClearAllControls = ClearAllControls;
var date_time_comb_tag;
(function (date_time_comb_tag) {
    date_time_comb_tag[date_time_comb_tag["DT_COMB_NONE"] = 0] = "DT_COMB_NONE";
    date_time_comb_tag[date_time_comb_tag["DT_COMB_ONLY_TIME"] = 1] = "DT_COMB_ONLY_TIME";
    // time in time_id, date in date_id
    date_time_comb_tag[date_time_comb_tag["DT_COMB_TIME_AND_DATE"] = 2] = "DT_COMB_TIME_AND_DATE";
    date_time_comb_tag[date_time_comb_tag["DT_COMB_ONLY_DATE"] = 3] = "DT_COMB_ONLY_DATE";
    date_time_comb_tag[date_time_comb_tag["DT_COMB_TIME_BEFORE_DATE"] = 4] = "DT_COMB_TIME_BEFORE_DATE";
    date_time_comb_tag[date_time_comb_tag["DT_COMB_DATE_BEFORE_TIME"] = 5] = "DT_COMB_DATE_BEFORE_TIME";
})(date_time_comb_tag = exports.date_time_comb_tag || (exports.date_time_comb_tag = {}));
;
var date_time_time_fmt_tag;
(function (date_time_time_fmt_tag) {
    //  5:05:46 PM
    date_time_time_fmt_tag[date_time_time_fmt_tag["DT_TM_II_0MM_0SS"] = 1] = "DT_TM_II_0MM_0SS";
    //  17:05:46
    date_time_time_fmt_tag[date_time_time_fmt_tag["DT_TM_HH_0MM_0SS"] = 2] = "DT_TM_HH_0MM_0SS";
    //  5:05 PM
    date_time_time_fmt_tag[date_time_time_fmt_tag["DT_TM_II_0MM"] = 10] = "DT_TM_II_0MM";
    //  17:05
    date_time_time_fmt_tag[date_time_time_fmt_tag["DT_TM_HH_0MM"] = 11] = "DT_TM_HH_0MM";
})(date_time_time_fmt_tag = exports.date_time_time_fmt_tag || (exports.date_time_time_fmt_tag = {}));
;
var date_time_date_fmt_tag;
(function (date_time_date_fmt_tag) {
    /**
     * "12.04.2018"
     */
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_DD_MM_YYYY"] = 1] = "DT_DT_DD_MM_YYYY";
    // 2 	"12.04.18"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_DD_MM_YY"] = 2] = "DT_DT_DD_MM_YY";
    // 10    "12 апр 2018"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_DD_MMM_YYYY"] = 10] = "DT_DT_DD_MMM_YYYY";
    // 11    "12 апр 18"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_DD_MMM_YY"] = 11] = "DT_DT_DD_MMM_YY";
    // 12    "12 апреля 2018"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_DD_MMMM_YYYY"] = 12] = "DT_DT_DD_MMMM_YYYY";
    // 13    "12 апреля 18"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_DD_MMMM_YY"] = 13] = "DT_DT_DD_MMMM_YY";
    /**
     * "12 апр"
     */
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_DD_MMM"] = 20] = "DT_DT_DD_MMM";
    /**
     * "12 апреля"
     */
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_DD_MMMM"] = 21] = "DT_DT_DD_MMMM";
    // 30    "Четв. 12.04.2018"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWW_DD_MM_YYYY"] = 30] = "DT_DT_WWW_DD_MM_YYYY";
    // 31    "Четв. 12.04.18"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWW_DD_MM_YY"] = 31] = "DT_DT_WWW_DD_MM_YY";
    // 32    "Четв. 12 апр 2018"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWW_DD_MMM_YYYY"] = 32] = "DT_DT_WWW_DD_MMM_YYYY";
    // 33    "Четв. 12 апр 18"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWW_DD_MMM_YY"] = 33] = "DT_DT_WWW_DD_MMM_YY";
    // 34    "Четв. 12 апреля 2018"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWW_DD_MMMM_YYYY"] = 34] = "DT_DT_WWW_DD_MMMM_YYYY";
    // 35    "Четв. 12 апреля 18"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWW_DD_MMMM_YY"] = 35] = "DT_DT_WWW_DD_MMMM_YY";
    /**
     * "Четв. 12 апр"
     */
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWW_DD_MMM"] = 36] = "DT_DT_WWW_DD_MMM";
    /**
     * "Четв. 12 апреля"
     */
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWW_DD_MMMM"] = 37] = "DT_DT_WWW_DD_MMMM";
    // 38    "Четверг, 12.04.2018"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWWW_DD_MM_YYYY"] = 38] = "DT_DT_WWWW_DD_MM_YYYY";
    // 39    "Четверг, 12.04.18"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWWW_DD_MM_YY"] = 39] = "DT_DT_WWWW_DD_MM_YY";
    // 40    "Четверг, 12 апр 2018"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWWW_DD_MMM_YYYY"] = 40] = "DT_DT_WWWW_DD_MMM_YYYY";
    // 41    "Четверг, 12 апр 18"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWWW_DD_MMM_YY"] = 41] = "DT_DT_WWWW_DD_MMM_YY";
    // 42    "Четверг, 12 апреля 2018"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWWW_DD_MMMM_YYYY"] = 42] = "DT_DT_WWWW_DD_MMMM_YYYY";
    // 43    "Четверг, 12 апреля 18"
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWWW_DD_MMMM_YY"] = 43] = "DT_DT_WWWW_DD_MMMM_YY";
    /**
     *  "Четверг, 12 апр"
     */
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWWW_DD_MMM"] = 44] = "DT_DT_WWWW_DD_MMM";
    /**
     * "Четверг, 12 апреля"
     */
    date_time_date_fmt_tag[date_time_date_fmt_tag["DT_DT_WWWW_DD_MMMM"] = 45] = "DT_DT_WWWW_DD_MMMM";
})(date_time_date_fmt_tag = exports.date_time_date_fmt_tag || (exports.date_time_date_fmt_tag = {}));
;
var ConfigDateAndTime = /** @class */ (function (_super) {
    __extends(ConfigDateAndTime, _super);
    function ConfigDateAndTime(timeLabel, dateLabel, dtCombine, timeFormat, dateFormat) {
        var _this = _super.call(this) || this;
        _this._timeLabel = timeLabel;
        _this._dateLabel = dateLabel;
        _this._dtCombine = dtCombine;
        _this._timeFormat = timeFormat;
        _this._dateFormat = dateFormat;
        return _this;
    }
    ConfigDateAndTime.prototype.getCommandBytes = function () {
        var timeLabelId = 0;
        var dateLabelId = 0;
        if (this._timeLabel != null) {
            timeLabelId = this._timeLabel.id;
        }
        if (this._dateLabel != null) {
            dateLabelId = this._dateLabel.id;
        }
        var buffer = new ArrayBuffer(11);
        var uint8 = new Uint8Array(buffer);
        uint8.set(strToBytes("dstc"));
        var vId = new DataView(buffer);
        vId.setUint16(4, timeLabelId, true);
        vId.setUint16(6, dateLabelId, true);
        vId.setUint8(8, this._dtCombine);
        vId.setUint8(9, this._timeFormat);
        vId.setUint8(10, this._dateFormat);
        return buffer;
    };
    return ConfigDateAndTime;
}(Command));
exports.ConfigDateAndTime = ConfigDateAndTime;
var Control = /** @class */ (function (_super) {
    __extends(Control, _super);
    function Control(id, parent, x, y, width, height, visible) {
        var _this = _super.call(this) || this;
        _this._parent = parent;
        _this._id = id;
        _this._x = x;
        _this._y = y;
        _this._width = width;
        _this._height = height;
        _this._visible = visible;
        if (AllControls[id] != null) {
            new Error("Control with this id (" + id + ") already exists!");
        }
        else {
            AllControls[id] = _this;
        }
        return _this;
    }
    Control.prototype.getCreateBytesHeader = function (commandName) {
        var parentId = 0;
        if (this._parent != null)
            parentId = this._parent.id;
        if (commandName.length != 4)
            return null;
        var buffer = new ArrayBuffer(17);
        var uint8 = new Uint8Array(buffer);
        uint8.set(strToBytes(commandName));
        var vId = new DataView(buffer);
        vId.setUint16(4, this._id, true);
        vId.setUint16(6, parentId, true);
        vId.setUint16(8, this._x, true);
        vId.setUint16(10, this._y, true);
        vId.setUint16(12, this._width, true);
        vId.setUint16(14, this._height, true);
        vId.setUint8(16, 1); // visible
        return uint8;
    };
    Object.defineProperty(Control.prototype, "onClick", {
        set: function (fun) {
            this._onClick = fun;
        },
        enumerable: true,
        configurable: true
    });
    Control.prototype.doEvent = function (ed) {
        console.log("doEvent");
        var tochEv = ed;
        //console.log(" ed as TouchEventData = " + tochEv);
        if (tochEv != null) {
            if (this._onClick != null)
                this._onClick(tochEv.x, tochEv.y);
        }
    };
    Object.defineProperty(Control.prototype, "id", {
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    Control.prototype.getCreateBytes = function () {
        console.log("def getCreateBytes");
        return null;
    };
    Control.prototype.show = function () {
        this.sendEvent(this.getCreateBytes());
    };
    // name - message name
    // payload - additional data
    Control.prototype.onMessage = function (name, payload) {
    };
    Object.defineProperty(Control.prototype, "visible", {
        get: function () {
            return this._visible;
        },
        set: function (vis) {
            if (this._visible == vis)
                return;
            this._visible = vis;
            var buffer = new ArrayBuffer(7);
            var uint8 = new Uint8Array(buffer);
            uint8.set(strToBytes("dsvi"));
            var vId = new DataView(buffer);
            vId.setUint16(4, this._id, true);
            vId.setUint8(6, this._visible ? 1 : 0);
            this.sendEvent(buffer);
        },
        enumerable: true,
        configurable: true
    });
    return Control;
}(Command));
var ContainerControl = /** @class */ (function (_super) {
    __extends(ContainerControl, _super);
    function ContainerControl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ContainerControl;
}(Control));
var Panel = /** @class */ (function (_super) {
    __extends(Panel, _super);
    function Panel(id, parent, x, y, width, height, visible, r, g, b) {
        if (r === void 0) { r = 0; }
        if (g === void 0) { g = 0; }
        if (b === void 0) { b = 0; }
        var _this = _super.call(this, id, parent, x, y, width, height, visible) || this;
        _this._bgR = r;
        _this._bgG = g;
        _this._bgB = b;
        _this.show();
        return _this;
    }
    Panel.prototype.getCreateBytes = function () {
        var header = this.getCreateBytesHeader("dpan");
        var buffer = new ArrayBuffer(header.length + 3);
        var uint8 = new Uint8Array(buffer);
        uint8.set(header);
        var vId = new DataView(buffer);
        vId.setUint8(17, this._bgR);
        vId.setUint8(18, this._bgG);
        vId.setUint8(19, this._bgB);
        console.log("Panel getCreateBytes " + buffer.byteLength);
        return buffer;
    };
    return Panel;
}(ContainerControl));
exports.Panel = Panel;
var TextControl = /** @class */ (function (_super) {
    __extends(TextControl, _super);
    function TextControl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(TextControl.prototype, "text", {
        get: function () {
            return this._text;
        },
        //dstx\x01\x00\x05\x00World
        set: function (txt) {
            this._text = txt;
            var textLen = this._text.length;
            var arrlen = 8 + textLen;
            var buffer = new ArrayBuffer(arrlen);
            var uint8 = new Uint8Array(buffer);
            uint8.set(strToBytes("dstx"));
            var vId = new DataView(buffer);
            vId.setUint16(4, this._id, true);
            vId.setUint16(6, textLen, true);
            uint8.set(strToBytes(this._text), 8);
            this.sendEvent(buffer);
        },
        enumerable: true,
        configurable: true
    });
    return TextControl;
}(Control));
exports.TextControl = TextControl;
var TextBox = /** @class */ (function (_super) {
    __extends(TextBox, _super);
    function TextBox(id, parent, x, y, width, height, visible, text, fsize, r, g, b) {
        if (text === void 0) { text = ""; }
        if (fsize === void 0) { fsize = 32; }
        if (r === void 0) { r = 0; }
        if (g === void 0) { g = 0; }
        if (b === void 0) { b = 0; }
        var _this = _super.call(this, id, parent, x, y, width, height, visible) || this;
        _this._text = text;
        _this._fontSize = fsize;
        _this._r = r;
        _this._g = g;
        _this._b = b;
        _this.show();
        return _this;
    }
    TextBox.prototype.getCreateBytes = function () {
        var header = this.getCreateBytesHeader("dtbx");
        var textLen = this._text.length;
        var buffer = new ArrayBuffer(header.length + 7 + textLen);
        var uint8 = new Uint8Array(buffer);
        uint8.set(header);
        var vId = new DataView(buffer);
        vId.setUint16(17, this._fontSize, true);
        vId.setUint8(19, this._r);
        vId.setUint8(20, this._g);
        vId.setUint8(21, this._b);
        vId.setUint16(22, textLen, true);
        uint8.set(strToBytes(this._text), 24);
        return buffer;
    };
    return TextBox;
}(TextControl));
exports.TextBox = TextBox;
var Label = /** @class */ (function (_super) {
    __extends(Label, _super);
    function Label(id, parent, x, y, width, height, visible, text, fsize, r, g, b) {
        if (text === void 0) { text = ""; }
        if (fsize === void 0) { fsize = 32; }
        if (r === void 0) { r = 0; }
        if (g === void 0) { g = 0; }
        if (b === void 0) { b = 0; }
        var _this = _super.call(this, id, parent, x, y, width, height, visible) || this;
        _this._text = text;
        _this._fontSize = fsize;
        _this._r = r;
        _this._g = g;
        _this._b = b;
        _this.show();
        return _this;
    }
    Label.prototype.getCreateBytes = function () {
        var header = this.getCreateBytesHeader("dlbl");
        var textLen = this._text.length;
        var buffer = new ArrayBuffer(header.length + 7 + textLen);
        var uint8 = new Uint8Array(buffer);
        uint8.set(header);
        var vId = new DataView(buffer);
        vId.setUint16(17, this._fontSize, true);
        vId.setUint8(19, this._r);
        vId.setUint8(20, this._g);
        vId.setUint8(21, this._b);
        vId.setUint16(22, textLen, true);
        uint8.set(strToBytes(this._text), 24);
        return buffer;
    };
    return Label;
}(TextControl));
exports.Label = Label;
var DkImageTypes;
(function (DkImageTypes) {
    DkImageTypes[DkImageTypes["Png"] = 0] = "Png";
})(DkImageTypes = exports.DkImageTypes || (exports.DkImageTypes = {}));
var DkImageScaleTypes;
(function (DkImageScaleTypes) {
    DkImageScaleTypes[DkImageScaleTypes["FitWidth"] = 1] = "FitWidth";
    DkImageScaleTypes[DkImageScaleTypes["FitHeight"] = 2] = "FitHeight";
    DkImageScaleTypes[DkImageScaleTypes["FitOnMaxDimention"] = 3] = "FitOnMaxDimention";
    DkImageScaleTypes[DkImageScaleTypes["FitOnMinDimension"] = 4] = "FitOnMinDimension";
    DkImageScaleTypes[DkImageScaleTypes["Stretch"] = 5] = "Stretch";
})(DkImageScaleTypes = exports.DkImageScaleTypes || (exports.DkImageScaleTypes = {}));
var Image = /** @class */ (function (_super) {
    __extends(Image, _super);
    //private _imageData: Buffer;
    function Image(id, parent, x, y, width, height, visible, imageType, scaleType, bgR, bgG, bgB, imageFilePath, imageUrl) {
        var _this = _super.call(this, id, parent, x, y, width, height, visible) || this;
        _this._imageType = imageType;
        _this._scaleType = scaleType;
        _this._bgR = bgR;
        _this._bgG = bgG;
        _this._bgB = bgB;
        _this._imageFilePath = imageFilePath;
        _this._imageUrl = imageUrl;
        if (!fs.existsSync(_this._imageFilePath)) {
            console.error("Image file not existis!");
            throw new Error("Image file not existis!");
        }
        _this.show();
        // костыль
        _this.sendImage();
        return _this;
    }
    Image.prototype.downloadImage = function (imageUrl, callback) {
        var request = require('request').defaults({ encoding: null });
        request(imageUrl, function (error, response, body) {
            if (error != null)
                console.log('error:', error); // Print the error if one occurred
            //console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            //console.log('body:', body); // Print the HTML for the Google homepage.
            //            if(body != null)
            //                this._imageData = body;
            callback(body);
        });
    };
    Image.prototype.sendImage = function () {
        if (this._imageFilePath != null) {
            var image = fs.readFile(this._imageFilePath, function (err, data) {
                console.log("wrighting image data " + data.length);
                if (err) {
                    console.log("There was an error writing the image");
                }
                wstreamWrite.write(data);
            });
            return;
        }
        /*if(this._imageData != null)
        {
            wstreamWrite.write(this._imageData);
        }*/
    };
    Image.prototype.sendSetImageEventHeader = function (imageSize) {
        var arrlen = 15;
        var buffer = new ArrayBuffer(arrlen);
        var uint8 = new Uint8Array(buffer);
        uint8.set(strToBytes("dsim"));
        var vId = new DataView(buffer);
        vId.setUint16(4, this._id, true);
        vId.setUint8(6, this._imageType);
        vId.setUint8(7, this._scaleType);
        vId.setUint8(8, this._bgR);
        vId.setUint8(9, this._bgG);
        vId.setUint8(10, this._bgB);
        vId.setUint32(11, imageSize, true);
        this.sendEvent(buffer);
    };
    Object.defineProperty(Image.prototype, "image", {
        set: function (imageFilePath) {
            if (this._imageFilePath == imageFilePath)
                return;
            if (!fs.existsSync(imageFilePath)) {
                console.error("Image file not existis!");
                return;
            }
            //this._imageData = null;
            this._imageFilePath = imageFilePath;
            var stats = fs.statSync(this._imageFilePath);
            var fileSizeInBytes = stats.size;
            /*
                    var arrlen = 15;
                    var buffer = new ArrayBuffer(arrlen);
                    var uint8 = new Uint8Array(buffer);
                    uint8.set(strToBytes("dsim"));
                    var vId = new DataView(buffer);
                    vId.setUint16(4, this._id, true);
                    vId.setUint8(6, this._imageType);
                    vId.setUint8(7, this._scaleType);
                    vId.setUint8(8, this._bgR);
                    vId.setUint8(9, this._bgG);
                    vId.setUint8(10, this._bgB);
            
                    vId.setUint32(11, fileSizeInBytes, true);
                    this.sendEvent(buffer);*/
            this.sendSetImageEventHeader(fileSizeInBytes);
            this.sendImage();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Image.prototype, "imageUrl", {
        set: function (imageUrl) {
            var _this = this;
            this.downloadImage(imageUrl, function (imageData) {
                if (imageData == null) {
                    console.log("imageData = null!");
                    return;
                }
                _this._imageFilePath = null;
                _this._imageUrl = imageUrl;
                _this.sendSetImageEventHeader(imageData.byteLength);
                wstreamWrite.write(imageData);
            });
            /* this._imageUrl = imageUrl;
             var request = require('request').defaults({ encoding: null });
             request.get(s3Url, function (err, res, body) {
                 //process exif here
             });*/
        },
        enumerable: true,
        configurable: true
    });
    Image.prototype.getCreateBytes = function () {
        var header = this.getCreateBytesHeader("dimg");
        var stats = fs.statSync(this._imageFilePath);
        var fileSizeInBytes = stats.size;
        var buffer = new ArrayBuffer(header.length + 9);
        var uint8 = new Uint8Array(buffer);
        uint8.set(header);
        var vId = new DataView(buffer);
        vId.setUint8(17, this._imageType);
        vId.setUint8(18, this._scaleType);
        vId.setUint8(19, this._bgR);
        vId.setUint8(20, this._bgG);
        vId.setUint8(21, this._bgB);
        vId.setUint32(22, fileSizeInBytes, true);
        return buffer;
    };
    return Image;
}(Control));
exports.Image = Image;
//# sourceMappingURL=controls.js.map