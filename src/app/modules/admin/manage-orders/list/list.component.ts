import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { FormControl } from "@angular/forms";
import { MatDrawer } from "@angular/material/sidenav";
import {
  BehaviorSubject,
  fromEvent,
  Observable,
  Subject,
  Subscription,
  zip,
} from "rxjs";
import { filter, switchMap, takeUntil, map } from "rxjs/operators";
import { TreoMediaWatcherService } from "@treo/services/media-watcher";

import { Order } from "app/models/order";
import { PageEvent, MatPaginator } from "@angular/material/paginator";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { Status } from "app/models/status";
import { SelectionModel } from "@angular/cdk/collections";
import { MatOption } from "@angular/material/core";
import { ExcelService } from "./../excel.service";
import * as moment from 'moment';

@Component({
  selector: "app-list",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListComponent implements OnInit {
  public modeSelect = "domain";

  drawerMode: "side" | "over";
  searchInputControl: FormControl;

  /* Order */
  orders$: Observable<Order[]>;
  dataSource: MatTableDataSource<any>;
  data = [
    {
      orderNo: 2929,
      creationDate: "2019-05-24T11:45:32Z",
      userLock: false,
      status: false,
      wareHouse: "tratiary",
      customer: "Emmi",
      email: "eblenkinship0@cafepress.com",
      readyToShip: true,
      requiredShipDate: "12/04/2020",
    },
    {
      orderNo: 9496,
      creationDate: "2018-11-20T17:11:47Z",
      userLock: true,
      status: true,
      wareHouse: "Primary",
      customer: "Sander",
      email: "stal1@gravatar.com",
      readyToShip: true,
      requiredShipDate: "21/11/2020",
    },
    {
      orderNo: 8537,
      creationDate: "2020-09-10T07:37:43Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Rosetta",
      email: "rshelp2@ucoz.com",
      readyToShip: true,
      requiredShipDate: "27/06/2020",
    },
    {
      orderNo: 7093,
      creationDate: "2018-05-21T15:11:46Z",
      userLock: false,
      status: true,
      wareHouse: "Primary",
      customer: "Alyda",
      email: "asams3@taobao.com",
      readyToShip: true,
      requiredShipDate: "02/06/2020",
    },
    {
      orderNo: 8908,
      creationDate: "2019-11-02T18:50:27Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Georgine",
      email: "gingon4@discuz.net",
      readyToShip: false,
      requiredShipDate: "15/03/2020",
    },
    {
      orderNo: 1911,
      creationDate: "2018-03-13T10:25:26Z",
      userLock: false,
      status: true,
      wareHouse: "Primary",
      customer: "Lizzy",
      email: "lisaacs5@spiegel.de",
      readyToShip: true,
      requiredShipDate: "19/06/2020",
    },
    {
      orderNo: 4796,
      creationDate: "2020-12-26T01:21:46Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Hanan",
      email: "hwinthrop6@symantec.com",
      readyToShip: true,
      requiredShipDate: "19/05/2020",
    },
    {
      orderNo: 5145,
      creationDate: "2018-11-08T23:00:56Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Chlo",
      email: "cferencowicz7@clickbank.net",
      readyToShip: true,
      requiredShipDate: "14/05/2020",
    },
    {
      orderNo: 7788,
      creationDate: "2019-04-29T10:55:01Z",
      userLock: true,
      status: true,
      wareHouse: "tratiary",
      customer: "Link",
      email: "lquinell8@salon.com",
      readyToShip: true,
      requiredShipDate: "11/09/2020",
    },
    {
      orderNo: 9413,
      creationDate: "2020-06-27T04:23:47Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Lydia",
      email: "lbrandreth9@newyorker.com",
      readyToShip: true,
      requiredShipDate: "30/06/2020",
    },
    {
      orderNo: 9596,
      creationDate: "2019-07-29T09:17:46Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Ryun",
      email: "rtwinninga@npr.org",
      readyToShip: true,
      requiredShipDate: "27/05/2020",
    },
    {
      orderNo: 4877,
      creationDate: "2019-06-05T09:05:19Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Hyatt",
      email: "hbulleynb@indiatimes.com",
      readyToShip: true,
      requiredShipDate: "04/06/2020",
    },
    {
      orderNo: 7495,
      creationDate: "2020-10-24T17:11:04Z",
      userLock: false,
      status: false,
      wareHouse: "Secondary",
      customer: "Ardyth",
      email: "aferierc@seattletimes.com",
      readyToShip: true,
      requiredShipDate: "10/07/2020",
    },
    {
      orderNo: 2966,
      creationDate: "2020-03-25T09:42:22Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Zaccaria",
      email: "zhansied@deliciousdays.com",
      readyToShip: true,
      requiredShipDate: "10/10/2020",
    },
    {
      orderNo: 6293,
      creationDate: "2020-01-11T20:45:47Z",
      userLock: false,
      status: false,
      wareHouse: "Secondary",
      customer: "Odette",
      email: "ostlouise@webeden.co.uk",
      readyToShip: true,
      requiredShipDate: "04/12/2020",
    },
    {
      orderNo: 7129,
      creationDate: "2018-07-31T19:37:32Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Viviene",
      email: "vhartmannf@disqus.com",
      readyToShip: true,
      requiredShipDate: "21/03/2020",
    },
    {
      orderNo: 2459,
      creationDate: "2019-05-19T03:37:04Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Hansiain",
      email: "hgoriolig@themeforest.net",
      readyToShip: true,
      requiredShipDate: "15/03/2020",
    },
    {
      orderNo: 9993,
      creationDate: "2020-05-08T05:00:55Z",
      userLock: true,
      status: false,
      wareHouse: "tratiary",
      customer: "Westley",
      email: "wkunzeh@netscape.com",
      readyToShip: false,
      requiredShipDate: "26/07/2020",
    },
    {
      orderNo: 2955,
      creationDate: "2018-04-01T11:15:18Z",
      userLock: true,
      status: true,
      wareHouse: "Secondary",
      customer: "Liva",
      email: "lsarfattii@economist.com",
      readyToShip: true,
      requiredShipDate: "08/12/2020",
    },
    {
      orderNo: 3828,
      creationDate: "2018-12-29T03:07:07Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Bernardina",
      email: "bannettj@ucsd.edu",
      readyToShip: false,
      requiredShipDate: "20/07/2020",
    },
    {
      orderNo: 9662,
      creationDate: "2020-06-21T16:42:56Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Cornela",
      email: "ccutressk@issuu.com",
      readyToShip: false,
      requiredShipDate: "21/03/2020",
    },
    {
      orderNo: 7929,
      creationDate: "2020-04-23T03:17:30Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Joachim",
      email: "jmeeronl@xinhuanet.com",
      readyToShip: false,
      requiredShipDate: "11/08/2020",
    },
    {
      orderNo: 3697,
      creationDate: "2018-09-19T23:45:47Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Yoshi",
      email: "yhenstridgem@cloudflare.com",
      readyToShip: false,
      requiredShipDate: "01/11/2020",
    },
    {
      orderNo: 8309,
      creationDate: "2020-07-27T16:27:05Z",
      userLock: false,
      status: true,
      wareHouse: "Secondary",
      customer: "Toni",
      email: "twedgwoodn@ftc.gov",
      readyToShip: true,
      requiredShipDate: "15/02/2020",
    },
    {
      orderNo: 3335,
      creationDate: "2018-06-25T06:46:15Z",
      userLock: true,
      status: true,
      wareHouse: "tratiary",
      customer: "Nicky",
      email: "nbeageno@cornell.edu",
      readyToShip: true,
      requiredShipDate: "02/02/2020",
    },
    {
      orderNo: 5717,
      creationDate: "2019-08-24T18:01:30Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Arin",
      email: "apughep@bbb.org",
      readyToShip: false,
      requiredShipDate: "19/08/2020",
    },
    {
      orderNo: 5567,
      creationDate: "2019-06-27T04:11:07Z",
      userLock: true,
      status: true,
      wareHouse: "tratiary",
      customer: "Derrek",
      email: "ddesvignesq@salon.com",
      readyToShip: false,
      requiredShipDate: "21/06/2020",
    },
    {
      orderNo: 4941,
      creationDate: "2019-07-09T10:02:37Z",
      userLock: true,
      status: true,
      wareHouse: "Secondary",
      customer: "Casar",
      email: "cgerhtsr@netlog.com",
      readyToShip: true,
      requiredShipDate: "10/03/2020",
    },
    {
      orderNo: 5719,
      creationDate: "2018-03-12T09:05:55Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Lonee",
      email: "lkahans@china.com.cn",
      readyToShip: false,
      requiredShipDate: "18/10/2020",
    },
    {
      orderNo: 1930,
      creationDate: "2019-05-26T16:50:23Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Tobi",
      email: "treinischt@jigsy.com",
      readyToShip: false,
      requiredShipDate: "28/02/2020",
    },
    {
      orderNo: 2376,
      creationDate: "2019-12-05T20:15:31Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Starr",
      email: "sbruunu@yale.edu",
      readyToShip: false,
      requiredShipDate: "19/02/2020",
    },
    {
      orderNo: 9134,
      creationDate: "2018-02-01T17:44:01Z",
      userLock: false,
      status: true,
      wareHouse: "Primary",
      customer: "Nanci",
      email: "nbotleyv@wix.com",
      readyToShip: false,
      requiredShipDate: "08/06/2020",
    },
    {
      orderNo: 5006,
      creationDate: "2020-06-27T12:33:37Z",
      userLock: false,
      status: false,
      wareHouse: "Secondary",
      customer: "Leesa",
      email: "lguitonw@youtube.com",
      readyToShip: false,
      requiredShipDate: "05/08/2020",
    },
    {
      orderNo: 9628,
      creationDate: "2018-11-14T02:08:14Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Jarib",
      email: "jmacanex@issuu.com",
      readyToShip: false,
      requiredShipDate: "07/08/2020",
    },
    {
      orderNo: 5638,
      creationDate: "2020-01-14T19:52:26Z",
      userLock: false,
      status: false,
      wareHouse: "Secondary",
      customer: "Durante",
      email: "dchristoly@gizmodo.com",
      readyToShip: false,
      requiredShipDate: "27/03/2020",
    },
    {
      orderNo: 2562,
      creationDate: "2020-09-06T20:32:13Z",
      userLock: true,
      status: true,
      wareHouse: "Primary",
      customer: "Kath",
      email: "kwilkennsonz@princeton.edu",
      readyToShip: false,
      requiredShipDate: "20/10/2020",
    },
    {
      orderNo: 7396,
      creationDate: "2018-08-23T17:04:28Z",
      userLock: true,
      status: true,
      wareHouse: "Secondary",
      customer: "Mateo",
      email: "mcrossley10@gov.uk",
      readyToShip: true,
      requiredShipDate: "14/01/2021",
    },
    {
      orderNo: 5232,
      creationDate: "2018-12-21T21:22:39Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Clywd",
      email: "cgrummitt11@bloglovin.com",
      readyToShip: true,
      requiredShipDate: "23/04/2020",
    },
    {
      orderNo: 3007,
      creationDate: "2018-05-12T05:28:02Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Aurie",
      email: "afurlong12@arstechnica.com",
      readyToShip: true,
      requiredShipDate: "10/02/2020",
    },
    {
      orderNo: 2526,
      creationDate: "2018-04-24T20:06:14Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Aurthur",
      email: "amoger13@pinterest.com",
      readyToShip: false,
      requiredShipDate: "05/04/2020",
    },
    {
      orderNo: 3370,
      creationDate: "2021-01-18T13:49:20Z",
      userLock: false,
      status: true,
      wareHouse: "Primary",
      customer: "Gwennie",
      email: "gclymo14@aol.com",
      readyToShip: true,
      requiredShipDate: "26/01/2020",
    },
    {
      orderNo: 9840,
      creationDate: "2020-08-29T13:34:41Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Myrtice",
      email: "moris15@ox.ac.uk",
      readyToShip: true,
      requiredShipDate: "10/06/2020",
    },
    {
      orderNo: 2782,
      creationDate: "2018-03-06T07:58:31Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Elyssa",
      email: "emabbot16@joomla.org",
      readyToShip: true,
      requiredShipDate: "17/05/2020",
    },
    {
      orderNo: 8716,
      creationDate: "2020-05-27T22:12:58Z",
      userLock: true,
      status: true,
      wareHouse: "tratiary",
      customer: "Gerri",
      email: "gmcwhin17@alexa.com",
      readyToShip: true,
      requiredShipDate: "29/05/2020",
    },
    {
      orderNo: 4175,
      creationDate: "2020-09-09T18:46:22Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Erwin",
      email: "ewatman18@lycos.com",
      readyToShip: true,
      requiredShipDate: "16/01/2021",
    },
    {
      orderNo: 5026,
      creationDate: "2018-04-06T12:49:15Z",
      userLock: false,
      status: true,
      wareHouse: "Secondary",
      customer: "Katalin",
      email: "kdelaci19@icq.com",
      readyToShip: true,
      requiredShipDate: "16/12/2020",
    },
    {
      orderNo: 1871,
      creationDate: "2019-11-24T20:04:38Z",
      userLock: false,
      status: true,
      wareHouse: "Secondary",
      customer: "Tabbie",
      email: "tdeppen1a@google.pl",
      readyToShip: false,
      requiredShipDate: "21/10/2020",
    },
    {
      orderNo: 6106,
      creationDate: "2018-10-25T17:11:58Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Kent",
      email: "kvoisey1b@whitehouse.gov",
      readyToShip: false,
      requiredShipDate: "20/01/2021",
    },
    {
      orderNo: 9820,
      creationDate: "2019-02-15T08:35:29Z",
      userLock: false,
      status: true,
      wareHouse: "Secondary",
      customer: "Jeniffer",
      email: "jtesdale1c@liveinternet.ru",
      readyToShip: false,
      requiredShipDate: "12/06/2020",
    },
    {
      orderNo: 3998,
      creationDate: "2018-03-29T03:27:35Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Conrad",
      email: "cpoli1d@hostgator.com",
      readyToShip: false,
      requiredShipDate: "28/04/2020",
    },
    {
      orderNo: 8381,
      creationDate: "2020-04-28T22:29:44Z",
      userLock: true,
      status: true,
      wareHouse: "tratiary",
      customer: "Vikky",
      email: "vlicciardiello1e@tuttocitta.it",
      readyToShip: false,
      requiredShipDate: "29/05/2020",
    },
    {
      orderNo: 8688,
      creationDate: "2019-12-06T14:56:12Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Linet",
      email: "lrolinson1f@delicious.com",
      readyToShip: false,
      requiredShipDate: "04/12/2020",
    },
    {
      orderNo: 8429,
      creationDate: "2020-03-29T15:36:39Z",
      userLock: false,
      status: false,
      wareHouse: "Secondary",
      customer: "Karina",
      email: "kbrende1g@disqus.com",
      readyToShip: false,
      requiredShipDate: "27/06/2020",
    },
    {
      orderNo: 6462,
      creationDate: "2019-08-20T03:07:24Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Joyann",
      email: "jcoote1h@dailymotion.com",
      readyToShip: false,
      requiredShipDate: "05/11/2020",
    },
    {
      orderNo: 9525,
      creationDate: "2019-07-10T09:49:27Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Zora",
      email: "zbridat1i@163.com",
      readyToShip: true,
      requiredShipDate: "20/09/2020",
    },
    {
      orderNo: 3260,
      creationDate: "2020-07-09T06:12:23Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Fey",
      email: "fadderson1j@simplemachines.org",
      readyToShip: true,
      requiredShipDate: "18/09/2020",
    },
    {
      orderNo: 6434,
      creationDate: "2018-05-12T22:44:49Z",
      userLock: false,
      status: true,
      wareHouse: "Secondary",
      customer: "Hewet",
      email: "hwinston1k@nsw.gov.au",
      readyToShip: true,
      requiredShipDate: "28/05/2020",
    },
    {
      orderNo: 6938,
      creationDate: "2018-04-17T10:58:33Z",
      userLock: true,
      status: true,
      wareHouse: "tratiary",
      customer: "Cecilius",
      email: "chessentaler1l@pagesperso-orange.fr",
      readyToShip: true,
      requiredShipDate: "18/08/2020",
    },
    {
      orderNo: 4469,
      creationDate: "2019-12-14T22:57:35Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Barny",
      email: "bsigg1m@weather.com",
      readyToShip: false,
      requiredShipDate: "11/10/2020",
    },
    {
      orderNo: 4180,
      creationDate: "2019-11-01T01:09:59Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Huntlee",
      email: "hjanaszewski1n@diigo.com",
      readyToShip: false,
      requiredShipDate: "28/09/2020",
    },
    {
      orderNo: 2128,
      creationDate: "2018-02-22T13:04:43Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Bronnie",
      email: "barcase1o@spiegel.de",
      readyToShip: false,
      requiredShipDate: "01/10/2020",
    },
    {
      orderNo: 9671,
      creationDate: "2018-08-03T10:19:54Z",
      userLock: false,
      status: true,
      wareHouse: "Secondary",
      customer: "Eva",
      email: "egrewes1p@irs.gov",
      readyToShip: false,
      requiredShipDate: "15/12/2020",
    },
    {
      orderNo: 8894,
      creationDate: "2019-11-07T08:24:32Z",
      userLock: false,
      status: true,
      wareHouse: "Secondary",
      customer: "Annelise",
      email: "acalderhead1q@fastcompany.com",
      readyToShip: false,
      requiredShipDate: "27/03/2020",
    },
    {
      orderNo: 8041,
      creationDate: "2018-12-06T10:52:05Z",
      userLock: false,
      status: true,
      wareHouse: "Primary",
      customer: "Minna",
      email: "mpittford1r@bing.com",
      readyToShip: true,
      requiredShipDate: "17/04/2020",
    },
    {
      orderNo: 9186,
      creationDate: "2018-12-06T04:55:53Z",
      userLock: true,
      status: true,
      wareHouse: "Secondary",
      customer: "Agathe",
      email: "atydeman1s@addthis.com",
      readyToShip: false,
      requiredShipDate: "07/02/2020",
    },
    {
      orderNo: 6035,
      creationDate: "2019-05-05T22:22:10Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Liza",
      email: "lzannolli1t@lulu.com",
      readyToShip: true,
      requiredShipDate: "31/03/2020",
    },
    {
      orderNo: 4849,
      creationDate: "2020-01-24T23:06:48Z",
      userLock: false,
      status: true,
      wareHouse: "Primary",
      customer: "Berny",
      email: "bskillman1u@360.cn",
      readyToShip: true,
      requiredShipDate: "29/05/2020",
    },
    {
      orderNo: 2912,
      creationDate: "2018-04-02T11:54:14Z",
      userLock: true,
      status: true,
      wareHouse: "Primary",
      customer: "Debbi",
      email: "ddunnet1v@dion.ne.jp",
      readyToShip: true,
      requiredShipDate: "14/05/2020",
    },
    {
      orderNo: 5339,
      creationDate: "2018-03-31T12:55:03Z",
      userLock: false,
      status: false,
      wareHouse: "Secondary",
      customer: "Farrand",
      email: "fgallo1w@qq.com",
      readyToShip: true,
      requiredShipDate: "02/08/2020",
    },
    {
      orderNo: 6114,
      creationDate: "2018-08-28T09:15:58Z",
      userLock: true,
      status: true,
      wareHouse: "Primary",
      customer: "Ronny",
      email: "rregelous1x@reuters.com",
      readyToShip: false,
      requiredShipDate: "02/05/2020",
    },
    {
      orderNo: 6981,
      creationDate: "2020-12-12T08:31:25Z",
      userLock: false,
      status: false,
      wareHouse: "tratiary",
      customer: "Edwin",
      email: "esebyer1y@bandcamp.com",
      readyToShip: true,
      requiredShipDate: "23/06/2020",
    },
    {
      orderNo: 9467,
      creationDate: "2019-08-31T17:23:29Z",
      userLock: true,
      status: true,
      wareHouse: "Secondary",
      customer: "Philippe",
      email: "pleynham1z@sitemeter.com",
      readyToShip: true,
      requiredShipDate: "12/07/2020",
    },
    {
      orderNo: 8703,
      creationDate: "2020-02-17T21:36:26Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Zeke",
      email: "zbenito20@quantcast.com",
      readyToShip: true,
      requiredShipDate: "28/05/2020",
    },
    {
      orderNo: 4624,
      creationDate: "2019-07-23T19:53:22Z",
      userLock: true,
      status: true,
      wareHouse: "Secondary",
      customer: "Hyacinth",
      email: "hrembrandt21@rambler.ru",
      readyToShip: true,
      requiredShipDate: "03/02/2020",
    },
    {
      orderNo: 3150,
      creationDate: "2019-01-21T09:26:06Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Deb",
      email: "dduffill22@army.mil",
      readyToShip: false,
      requiredShipDate: "02/11/2020",
    },
    {
      orderNo: 9015,
      creationDate: "2018-09-29T22:06:27Z",
      userLock: false,
      status: false,
      wareHouse: "Secondary",
      customer: "Renae",
      email: "rguichard23@fda.gov",
      readyToShip: true,
      requiredShipDate: "03/06/2020",
    },
    {
      orderNo: 1949,
      creationDate: "2019-06-13T11:52:36Z",
      userLock: false,
      status: false,
      wareHouse: "Secondary",
      customer: "Beale",
      email: "bpykett24@tumblr.com",
      readyToShip: true,
      requiredShipDate: "22/03/2020",
    },
    {
      orderNo: 7797,
      creationDate: "2020-07-02T22:14:57Z",
      userLock: true,
      status: true,
      wareHouse: "tratiary",
      customer: "Angelique",
      email: "ayerborn25@t.co",
      readyToShip: false,
      requiredShipDate: "07/12/2020",
    },
    {
      orderNo: 5449,
      creationDate: "2019-01-07T06:37:30Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Eduard",
      email: "ebembridge26@upenn.edu",
      readyToShip: false,
      requiredShipDate: "31/08/2020",
    },
    {
      orderNo: 1537,
      creationDate: "2018-07-21T01:56:05Z",
      userLock: true,
      status: true,
      wareHouse: "Secondary",
      customer: "Adiana",
      email: "akerr27@dell.com",
      readyToShip: false,
      requiredShipDate: "05/06/2020",
    },
    {
      orderNo: 6810,
      creationDate: "2019-10-28T10:12:30Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Eleen",
      email: "erajchert28@wordpress.org",
      readyToShip: true,
      requiredShipDate: "15/01/2021",
    },
    {
      orderNo: 6460,
      creationDate: "2018-03-27T14:24:07Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Port",
      email: "pbaffin29@simplemachines.org",
      readyToShip: true,
      requiredShipDate: "08/04/2020",
    },
    {
      orderNo: 9261,
      creationDate: "2018-04-02T11:28:12Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Marjie",
      email: "mcollier2a@yahoo.com",
      readyToShip: false,
      requiredShipDate: "22/11/2020",
    },
    {
      orderNo: 7135,
      creationDate: "2020-08-08T18:36:02Z",
      userLock: true,
      status: true,
      wareHouse: "Secondary",
      customer: "Derby",
      email: "dtindley2b@java.com",
      readyToShip: true,
      requiredShipDate: "12/11/2020",
    },
    {
      orderNo: 4642,
      creationDate: "2020-12-07T11:34:24Z",
      userLock: false,
      status: true,
      wareHouse: "tratiary",
      customer: "Addison",
      email: "amargetson2c@time.com",
      readyToShip: true,
      requiredShipDate: "06/05/2020",
    },
    {
      orderNo: 2870,
      creationDate: "2019-12-07T02:49:53Z",
      userLock: true,
      status: false,
      wareHouse: "tratiary",
      customer: "Brendan",
      email: "broadnight2d@imdb.com",
      readyToShip: true,
      requiredShipDate: "26/08/2020",
    },
    {
      orderNo: 4707,
      creationDate: "2020-10-03T00:10:21Z",
      userLock: true,
      status: true,
      wareHouse: "Secondary",
      customer: "Julietta",
      email: "jwerndley2e@plala.or.jp",
      readyToShip: false,
      requiredShipDate: "28/05/2020",
    },
    {
      orderNo: 3076,
      creationDate: "2020-09-21T16:10:41Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Shermie",
      email: "sranklin2f@shinystat.com",
      readyToShip: true,
      requiredShipDate: "20/09/2020",
    },
    {
      orderNo: 1430,
      creationDate: "2020-06-20T23:37:53Z",
      userLock: true,
      status: false,
      wareHouse: "tratiary",
      customer: "Edmon",
      email: "erush2g@intel.com",
      readyToShip: true,
      requiredShipDate: "28/12/2020",
    },
    {
      orderNo: 5158,
      creationDate: "2019-11-23T14:01:52Z",
      userLock: false,
      status: false,
      wareHouse: "Primary",
      customer: "Gabbie",
      email: "givanishin2h@google.co.jp",
      readyToShip: true,
      requiredShipDate: "06/06/2020",
    },
    {
      orderNo: 5054,
      creationDate: "2020-10-31T21:11:15Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Birdie",
      email: "bgroll2i@elpais.com",
      readyToShip: true,
      requiredShipDate: "09/01/2021",
    },
    {
      orderNo: 7819,
      creationDate: "2019-06-22T12:09:47Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Tracey",
      email: "twarman2j@reference.com",
      readyToShip: true,
      requiredShipDate: "27/04/2020",
    },
    {
      orderNo: 8903,
      creationDate: "2018-05-21T09:55:06Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Tonie",
      email: "tfurzer2k@washington.edu",
      readyToShip: true,
      requiredShipDate: "18/06/2020",
    },
    {
      orderNo: 9728,
      creationDate: "2020-04-08T02:53:56Z",
      userLock: false,
      status: true,
      wareHouse: "Primary",
      customer: "Evangelia",
      email: "enewiss2l@reddit.com",
      readyToShip: true,
      requiredShipDate: "23/02/2020",
    },
    {
      orderNo: 3966,
      creationDate: "2018-09-27T03:04:46Z",
      userLock: true,
      status: true,
      wareHouse: "tratiary",
      customer: "Vitoria",
      email: "vburniston2m@gizmodo.com",
      readyToShip: true,
      requiredShipDate: "29/02/2020",
    },
    {
      orderNo: 9556,
      creationDate: "2020-06-17T08:23:43Z",
      userLock: true,
      status: true,
      wareHouse: "Primary",
      customer: "Dudley",
      email: "dgarratt2n@mediafire.com",
      readyToShip: false,
      requiredShipDate: "04/11/2020",
    },
    {
      orderNo: 4058,
      creationDate: "2019-03-06T22:51:16Z",
      userLock: true,
      status: false,
      wareHouse: "Primary",
      customer: "Britt",
      email: "bconrath2o@gravatar.com",
      readyToShip: true,
      requiredShipDate: "15/08/2020",
    },
    {
      orderNo: 3493,
      creationDate: "2018-05-10T14:32:28Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Ulric",
      email: "ucunio2p@indiatimes.com",
      readyToShip: true,
      requiredShipDate: "30/12/2020",
    },
    {
      orderNo: 6694,
      creationDate: "2019-02-12T02:29:06Z",
      userLock: false,
      status: true,
      wareHouse: "Primary",
      customer: "Lilia",
      email: "lhaining2q@reuters.com",
      readyToShip: false,
      requiredShipDate: "14/12/2020",
    },
    {
      orderNo: 4994,
      creationDate: "2020-03-08T04:38:42Z",
      userLock: true,
      status: false,
      wareHouse: "Secondary",
      customer: "Giordano",
      email: "gkem2r@nyu.edu",
      readyToShip: false,
      requiredShipDate: "14/10/2020",
    },
  ];
  ordersCount: number;
  ordersTableColumns: string[];
  tableColumns: any[];
  isAllShow = true;
  filter = {
    status: 2,
    searchQuery: "",
    readyToShip: null,
    userLock: null,
    startDate: null,
    endDate: null
  };
  
  webShops: string[] = ['WebShop', 'WebShop 1', 'WebShop 2', 'WebShop 3', 'WebShop 4'];

  selectedWebShops: string[] = ['WebShop'];
  selectedWebShop = 'WebShop';

  selectedOrder = null;
  statuses: Map<string, string>;
  /* Order */
  /* Pagination */
  pageSize = 15;
  pageSizeOptions: number[] = [15, 25, 50, 100];
  pageEvent: PageEvent;
  curPageFirstOrderMark: string;
  curPageLastOrderMark: string;
  isInitialLoading: boolean;
  isLoading: boolean;
  selection = new SelectionModel<Order>(true, []);
  /* Pagination */

  @ViewChild("matDrawer", { static: true })
  matDrawer: MatDrawer;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  // Private
  private _unsubscribeAll: Subject<any>;
  private ordersSubscription: Subscription = new Subscription();
  private OrderCountSubscription: Subscription;
  private statusSubscription: Subscription;

  /**
   * Constructor
   *
   * @param {ActivatedRoute} _activatedRoute
   * @param {ChangeDetectorRef} _changeDetectorRef
   * @param {OrdersService} _ordersService
   * @param {DOCUMENT} _document
   * @param {Router} _router
   * @param {TreoMediaWatcherService} _treoMediaWatcherService
   */
  constructor(
    private _activatedRoute: ActivatedRoute,
    private _changeDetectorRef: ChangeDetectorRef,
    @Inject(DOCUMENT) private _document: any,
    private _router: Router,
    private _treoMediaWatcherService: TreoMediaWatcherService,
    private excelService: ExcelService
  ) {
    // Set the private defaults
    this._unsubscribeAll = new Subject();

    // Set the defaults
    this.searchInputControl = new FormControl();
    this.dataSource = new MatTableDataSource(this.data);

    this.ordersCount = this.data.length;
    this.ordersTableColumns = [
      "select",
      "order",
      "creationDate",
      "userLock",
      "status",
      "wareHouse",
      "customer",
      "email",
      "readyToShip",
      "requiredShipDate",
    ];
    this.tableColumns = [
      { name: "order", isShow: true },
      { name: "creationDate", isShow: true },
      { name: "userLock", isShow: true },
      { name: "status", isShow: true },
      { name: "wareHouse", isShow: true },
      { name: "customer", isShow: true },
      { name: "email", isShow: true },
      { name: "readyToShip", isShow: true },
      { name: "requiredShipDate", isShow: true },
    ];

    this.statuses = new Map();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Get the orders
    this.isLoading = true;
    this.isInitialLoading = false;

    // set the interval here to hide the loader

    // Subscribe to media query change
    this._treoMediaWatcherService
      .onMediaQueryChange$("(min-width: 1440px)")
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((state) => {
        // Calculate the drawer mode
        this.drawerMode = state.matches ? "side" : "over";

        // Mark for check
        this._changeDetectorRef.markForCheck();
      });

    this.matDrawer.openedChange.subscribe((opened: boolean) => {
      if (!opened) {
        this._changeDetectorRef.markForCheck();
      }
    });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.ordersSubscription?.unsubscribe();
    this.OrderCountSubscription?.unsubscribe();
    this.statusSubscription?.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.refreshOrderList();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------
  paginate(pageEvent?: PageEvent) {
    
    // set interval to hide the loader
    this.pageEvent =  pageEvent;

  }

  sortOrders(sort: Sort) {
    let orderList = this.dataSource.data;
    if (!sort.active || sort.direction === "") {
      return;
    }
    this.dataSource = new MatTableDataSource(
      this.data
        .sort((a, b) => {
          const isAsc = sort.direction === "asc";
          switch (sort.active) {
            case "order":
              return this.compare(a.orderNo, b.orderNo, isAsc);
            case "creationDate":
              return this.compare(a.creationDate, b.creationDate, isAsc);
            case "userLock":
              return this.compare(a.userLock, b.userLock, isAsc);
            case "status":
              return this.compare(a.status, b.status, isAsc);
            case "wareHouse":
              return this.compare(a.wareHouse, b.wareHouse, isAsc);
            case "customer":
              return this.compare(a.customer, b.customer, isAsc);
            case "email":
              return this.compare(a.email, b.email, isAsc);
            case "readyToShip":
              return this.compare(a.readyToShip, b.readyToShip, isAsc);
            case "requiredShipDate":
              return this.compare(
                a.requiredShipDate,
                b.requiredShipDate,
                isAsc
              );
          }
        })
        
    );
    this.dataSource.sort = this.sort;
  }
  private compare(
    a: number | string | boolean,
    b: number | string | boolean,
    isAsc: boolean
  ) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  refreshOrderList() {
    // Mark for check
    this.isLoading = false;
    this.dataSource = new MatTableDataSource(this.data);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  refreshOneOrder(order: Order) {
    const data = this.dataSource.data;
    let index: number = data.findIndex((o) => o.uniqueId === order.uniqueId);
    if (index > -1) {
      data[index] = order;
    }
    this.dataSource = new MatTableDataSource(data.slice(0,15));
    this.dataSource.sort = this.sort;
    this._changeDetectorRef.markForCheck();
  }

  /**
   * On backdrop clicked
   */
  onBackdropClicked(): void {
    // Get the current activated route
  //   let route = this._activatedRoute;
  //   while (route.firstChild) {
  //     route = route.firstChild;
  //   }

  //   // Go to the parent route
  //   this._router.navigate(["/manage-orders"]);

  //   // Mark for check
  //   this._changeDetectorRef.markForCheck();
  this.matDrawer.close();
  // this.selectedOrder = null;
  }
  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  test(val: any) {
    let t = val;
  }
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: Order): string {
    if (!row) {
      return `${this.isAllSelected() ? "select" : "deselect"} all`;
    }
    return `${this.selection.isSelected(row) ? "deselect" : "select"} row ${
      row.id
    }`;
  }
  updateAllComplete() {
    this.ordersTableColumns = [
      "select",
      ...this.tableColumns.filter((e) => e.isShow).map((e) => e.name),
    ];
    this.isAllShow =
      this.ordersTableColumns.length === this.tableColumns.length + 1;
  }
  updateIsAllShow() {
    if (this.isAllShow) {
      this.ordersTableColumns = [
        "select",
        ...this.tableColumns.map((e) => e.name),
      ];
      this.tableColumns.forEach((e) => (e.isShow = true));
    } else {
      this.ordersTableColumns = ["select"];
      this.tableColumns.forEach((e) => (e.isShow = false));
    }
  }
  onClickXLSXExport() {
    this.excelService.exportAsExcelFile(this.dataSource.data, "Orders");
  }
  onOrderStatusFilter(status) {
    this.filter.status = status;
    this.onFilterChange();
  }
  onFilterChange() {
    let dataSrc = this.data.filter((e) =>
      e.customer.toLowerCase().includes(this.filter.searchQuery.toLowerCase())
    );
    if(this.filter.startDate && this.filter.endDate) {
      
      dataSrc = dataSrc.filter((e) => moment(e.creationDate).isBetween(this.filter.startDate, this.filter.endDate));
      
    }
    if (this.filter.status === 1) {
      dataSrc = dataSrc.filter((e) => e.status === true);
    } else if (this.filter.status === 0) {
      dataSrc = dataSrc.filter((e) => e.status === false);
    }
    if (this.filter.readyToShip === 1) {
      dataSrc = dataSrc.filter((e) => e.readyToShip === true);
    } else if (this.filter.readyToShip === 0) {
      dataSrc = dataSrc.filter((e) => e.readyToShip === false);
    }
    if (this.filter.userLock === 1) {
      dataSrc = dataSrc.filter((e) => e.userLock === true);
    } else if (this.filter.userLock === 0) {
      dataSrc = dataSrc.filter((e) => e.userLock === false);
    }
    this.dataSource.data = dataSrc;

  }
  getChecked(webShop){
    return this.selectedWebShops.includes(webShop);
  }
  goToOrder(orderNo): void
  {
          
    this.selectedOrder = this.dataSource.data.find(order => order.orderNo === orderNo);
          this.matDrawer.open();
          // Get the current activated route
          // let route = this._activatedRoute;
          // while ( route.firstChild )
          // {
          //     route = route.firstChild;
          // }
          // selectedOrder = Object.assign(selectedOrder);
          // sessionStorage.setItem("selectedManageOrder", JSON.stringify(selectedOrder));
          // this._router.navigateByUrl("manage-orders/" + orderNo);
          // // Mark for check
          // this._changeDetectorRef.markForCheck();
          console.log(this.selectedOrder);
  }

}
