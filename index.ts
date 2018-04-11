
import * as hexdump from 'hexdump-nodejs';
import * as fs from 'fs';
import * as Controls from './controls'
import * as sleep from 'sleep';
//const OpenWeatherMapHelper = require("openweathermap-node");
const path = require('path');




/*
const helper = new OpenWeatherMapHelper(
    {
        APPID: '0434c6d01cbcbdfe5c51f15eb5fe9e5b',
        units: "metric"
    }
);


helper.getCurrentWeatherByGeoCoordinates(55.9352591, 37.9313304, (err, currentWeather) => {
    if(err){
        console.log(err);
    }
    else{
        console.log(currentWeather);
    }
});
*/
/*
var request = require('request').defaults({ encoding: null });
        request("http://api.openweathermap.org/data/2.5/weather?lat=55.9352591&lon=37.9313304&appid=0434c6d01cbcbdfe5c51f15eb5fe9e5b&units=metric&lang=ru", function (error, response, body) {
            console.log('error:', error); // Print the error if one occurred
            //console.dir(response); // Print the response status code if a response was received
            console.log('body:', body); // Print the HTML for the Google homepage.
            if(body != null)
            {
                console.log('body size:', body.length);
                console.log('body type:', body.constructor.name);
                let jsonVal = JSON.parse(body);
                console.log(jsonVal);
            }
        });*/

Controls.init('/tmp/kedei_lcd_in', '/tmp/kedei_lcd_out');
const clearAllControls = new Controls.ClearAllControls();
clearAllControls.send();

const statusPanel = new Controls.Panel(1, null,  0, 0, 480, 30, true, 3, 5, 8);

const tb = new Controls.TextBox(14, null,  10, 200, 200, 30, true, "koooogoo", 22, 3, 5, 80);



tb.onClick = (x, y) => {
    console.log("Yahooo! " + x + " " + y);
}

const testPanel = new Controls.Panel(2, null,  30, 150, 200, 100, true, 3, 5, 8);

const lbTime = new Controls.Label(15, statusPanel,  5, 0, 400, 30, true, "labell time", 22, 180, 180, 85);
//const lbDate = new Controls.Label(wstreamWrite, 16, ststusPanel,  10, 100, 330, 30, "labell date", 22, 180, 180, 85);

const setTimeFmtCmd = new Controls.ConfigDateAndTime(lbTime, null, 
    Controls.date_time_comb_tag.DT_COMB_TIME_BEFORE_DATE,
    Controls.date_time_time_fmt_tag.DT_TM_II_0MM, Controls.date_time_date_fmt_tag.DT_DT_WWWW_DD_MMMM);
setTimeFmtCmd.send();

let imglist = ["http://openweathermap.org/img/w/10d.png", 
            "http://openweathermap.org/img/w/01n.png", 
            "http://openweathermap.org/img/w/09d.png", 
            "http://openweathermap.org/img/w/11d.png"];


const img = new Controls.Image(100, null, 100, 100, 100, 100, true, Controls.DkImageTypes.Png, 
    Controls.DkImageScaleTypes.Stretch, 100, 100, 100, "./error.png", null);


let curimgIndex = 0;

setInterval( ()=> {
    img.imageUrl = imglist[curimgIndex];
    curimgIndex++;
    if(curimgIndex >= imglist.length)
    {
        curimgIndex = 0;
    }
}, 5000);
