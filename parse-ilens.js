import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import fs from 'fs';

const tcs = ["2025KAJIKI","2025NONAME2","2025PODUL","2025WIPHA","2025DANAS","2025NONAME","2025WUTIP","2024MAN-YI","2024TORAJI","2024YINXING","2024TRAMI","2024YAGI","2024PRAPIROON","2024MALIKSI","2023KOINU","2023HAIKUI","2023SAOLA","2023DOKSURI","2023TALIM","2022NALGAE","2022NESAT","2022MA-ON","2022MULAN","2022NONAME","2022CHABA","2021RAI","2021KOMPASU","2021LIONROCK","2021LUPIT","2021CEMPAKA","2021NONAME2","2021NONAME","2021KOGUMA","2020SAUDEL","2020NANGKA","2020HIGOS","2020SINLAKU","2020NURI","2019KAJIKI","2019PODUL","2019BAILU","2019WIPHA","2019MUN","2018YUTU","2018MANGKHUT","2018BARIJAT","2018BEBINCA","2018SON-TINH","2018EWINIAR","2017KHANUN","2017NONAME","2017MAWAR","2017PAKHAR","2017HATO","2017ROKE","2017MERBOK","2016HAIMA","2016SARIKA","2016AERE","2016MEGI","2016MERANTI","2016DIANMU","2016NIDA","2016MIRINAE","2016NONAME","2015MUJIGAE","2015LINFA","2015KUJIRA","2014KALMAEGI","2014NONAME","2014RAMMASUN","2014HAGIBIS","2013KROSA","2013USAGI","2013UTOR","2013JEBI","2013CIMARON","2013RUMBIA","2013BEBINCA","2012TEMBIN","2012KAI-TAK","2012VICENTE","2012DOKSURI","2012TALIM","2011NALGAE","2011NESAT","2011NOCK-TEN","2011HAIMA","2011SARIKA","2010MEGI","2010FANAPI","2010LIONROCK","2010CHANTHU","2010CONSON","2009KETSANA","2009KOPPU","2009MUJIGAE","2009GONI","2009MOLAVE","2009SOUDELOR","2009NANGKA","2009LINFA","2008HIGOS","2008HAGUPIT","2008NURI","2008KAMMURI","2008FENGSHEN","2008NEOGURI","2007FRANCISCO","2007PABUK","2006CIMARON","2006NONAME2","2006NONAME1","2006BOPHA","2006PRAPIROON"]
const out = {};

tcs.reduce((prom, tc) => prom
    .then(() => fetch(`https://i-lens.hk/hkweather/tc_warning_bulletin.php?search_method=1&tc=${tc}&summary=Y`))
    .then(resp => resp.text())
    .then(html => {
        let doc = new JSDOM(html).window.document;
        let signal = Math.max(...[...doc.querySelectorAll('tbody td:nth-child(4)')].map(td => parseInt(td.textContent)));
        if (signal < 8 && tc != "2006PRAPIROON") return;

        out[tc] = [...doc.querySelectorAll('tbody tr')].map(tr => 
            [tr.children[4], tr.children[5]].map(td => parseFloat(td.textContent))
        );
    }), Promise.resolve())
.then(() => fs.promises.writeFile('lens.json', JSON.stringify(out)))

function cal(points) {
    const R = 6371;
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const output = {east: [], south: [], west: [], north: []}

    const lat1Rad = toRadians(22.3), lon1Rad = toRadians(114.2);
    let cpa = 800;
    points.forEach(point => {
        const lat2Rad = toRadians(point[0]), lon2Rad = toRadians(point[1]);

        const dLat = lat2Rad - lat1Rad, dLon = lon2Rad - lon1Rad;

        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = Math.round(R * c);
        distance < cpa && (cpa = distance);

        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        let bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

        const leftR = 10;
        if (bearing < 45 - leftR || bearing > 315 - leftR) {
            output.north.push(distance);
        } else if (bearing <= 135 - leftR) {
            output.east.push(distance);
        } else if (bearing < 225 - leftR - 10) {
            output.south.push(distance);
        } else {
            output.west.push(distance);
        }
    });
    return Object.fromEntries(Object.entries(output).map(([quad, dists]) => [quad, Math.min(...dists)]))
}