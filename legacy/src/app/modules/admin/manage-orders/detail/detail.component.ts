import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import {ListComponent } from '../list/list.component';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss']
})
export class DetailComponent implements OnInit {
  editMode = false;
  @Input() order = null;
  private routeSubscription: Subscription;

  constructor(
    private _activatedRoute: ActivatedRoute,
    private _listComponent: ListComponent,

  ){}
  ngOnInit(){
    
    

  }
  enableEditMode() {
    this.editMode = true;
  }
  onClose() {
    this._listComponent.onBackdropClicked();
  }
}
