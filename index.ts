
import * as hexdump from 'hexdump-nodejs';
import * as fs from 'fs';
import * as Controls from './controls'
import * as sleep from 'sleep';






Controls.init('/tmp/kedei_lcd_in', '/tmp/kedei_lcd_out');


const clearAllControls = new Controls.ClearAllControls();

clearAllControls.send();

const statusPanel = new Controls.Panel(1, null,  0, 0, 480, 30, true, 3, 5, 8);

const tb = new Controls.TextBox(14, null,  10, 200, 200, 30, true, "koooogoo", 22, 3, 5, 80);



tb.onClick = (x, y) => {
    console.log("Yahooo! " + x + " " + y);
}

const testPanel = new Controls.Panel(2, null,  30, 150, 200, 100, true, 3, 5, 8);

/*var buff = Buffer.from(tb.getCommandBytes());

console.log(hexdump(buff));
wstream.write(buff);*/

const lbTime = new Controls.Label(15, statusPanel,  5, 0, 400, 30, true, "labell time", 22, 180, 180, 85);
//const lbDate = new Controls.Label(wstreamWrite, 16, ststusPanel,  10, 100, 330, 30, "labell date", 22, 180, 180, 85);

const setTimeFmtCmd = new Controls.ConfigDateAndTime(lbTime, null, 
    Controls.date_time_comb_tag.DT_COMB_TIME_BEFORE_DATE,
    Controls.date_time_time_fmt_tag.DT_TM_II_0MM, Controls.date_time_date_fmt_tag.DT_DT_WWWW_DD_MMMM);
setTimeFmtCmd.send();
/*setInterval(()=>
{
    lb.text = (new Date()).toTimeString();
}, 2000);*/
/*buff = Buffer.from(lb.getCommandBytes());

console.log(hexdump(buff));
wstream.write(buff);*/

setInterval( ()=> {
    testPanel.visible = !testPanel.visible;
}, 5000);
