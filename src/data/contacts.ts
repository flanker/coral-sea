import {iso,type Contact} from '../model';
import {recordTime} from '../time';
import {places} from './events';
export const contacts:Contact[]=[
 {id:'us-false',side:'us',observedAt:iso('1942-05-07 08:45'),receivedAt:iso('1942-05-07 08:45'),title:'报告：两艘航母',body:'报告坐标10°03′S、152°27′E，两艘航母及四艘重巡洋舰。观察分钟未单列，陈旧程度从08:45接收时起计。',location:places.false7,certainty:'未经确认',eventId:'07-us-error'},
 {id:'us-corrected',side:'us',observedAt:iso('1942-05-07 08:45'),receivedAt:iso('1942-05-07 11:00'),title:'修正：巡洋舰群',body:'原报告编码有误。保留最后报告位置，未重新跟踪。',location:places.false7,certainty:'已修正原识别',eventId:'07-us-error',supersedes:'us-false'},
 {id:'jp-false',side:'jp',observedAt:iso('1942-05-07 08:30'),receivedAt:iso('1942-05-07 09:00'),title:'疑似航母与巡洋舰',body:'南方海面发现目标，舰种尚未核实。接收窗口使用约时。',location:places.oil,certainty:'未经确认',eventId:'07-jp-error'},
 {id:'jp-corrected',side:'jp',observedAt:iso('1942-05-07 12:01'),receivedAt:iso('1942-05-07 16:00'),title:'修正：非航母目标',body:'返航攻击机带回修正，早前舰种判断不能成立。此处仍是报告位置。',location:places.oil,certainty:'初报已撤回',eventId:'07-sims',supersedes:'jp-false'},
 {id:'jp-contact7',side:'jp',observedAt:iso('1942-05-07 15:00'),receivedAt:iso('1942-05-07 15:00'),title:'另一处敌航母报告',body:'原报告经纬度及接收分钟未知；地图用接触大区示意。陈旧程度从约略呈现节点计算。',location:places.us7,certainty:'位置、时刻均为示意',eventId:'07-jp-new-contact'},
 {id:'us-carrier8',side:'us',observedAt:recordTime('1942-05-08 08:20','oni4'),receivedAt:recordTime('1942-05-08 08:20','oni4'),title:'两艘航母及护航舰',body:'侦察机报告东北方敌舰向南航行。这是最后获知位置，不是实时追踪。',location:places.jp8,certainty:'侦察接触',eventId:'08-contact'},
 {id:'jp-carrier8',side:'jp',observedAt:iso('1942-05-08 08:20'),receivedAt:iso('1942-05-08 08:30'),title:'敌航母编队',body:'南方敌航母接触，坐标与接收分钟为约略重建。',location:places.us8,certainty:'侦察接触',eventId:'08-contact'}
];
