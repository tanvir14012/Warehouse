import { Injectable } from '@angular/core';
import * as Excel from "exceljs"
import * as fs from 'file-saver';

import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  constructor() { }
  public exportAsExcelFile(data: any, excelFileName: string): void {


    let workbook = new Excel.Workbook();
    let worksheet = workbook.addWorksheet('ProductSheet');

    worksheet.columns = [
    { header: 'Order', key: 'orderNo', width: 50 },
    { header: 'Creation Date', key: 'creationDate', width: 50 },
    { header: 'User Lock', key: 'userLock', width: 50 },
    { header: 'Status', key: 'status', width: 50 },
    { header: 'Ware House', key: 'wareHouse', width: 30 },
    { header: 'Customer', key: 'customer', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Ready To Ship', key: 'readyToShip', width: 30 },
    { header: 'Required Ship Date', key: 'requiredShipDate', width: 30 },
    ] as any;
    data.forEach(e => {
      worksheet.addRow({
        "orderNo": e.orderNo,
        "creationDate": e.creationDate,
        "userLock": e.userLock,
        "status": e.status,
        "wareHouse": e.wareHouse,
        "customer": e.customer,
        "email": e.email,
        "readyToShip": e.readyToShip,
        "requiredShipDate": e.requiredShipDate,
      },"n");
    });
    worksheet.getRow(1).font = { name: 'Comic Sans MS', family: 4, size: 16, underline: 'double', bold: true };
    workbook.xlsx.writeBuffer().then((data) => {
      let blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      fs.saveAs(blob, excelFileName+'.xlsx');
    })

  }
}