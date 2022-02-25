import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { FaqCategory, Guide, GuideCategory } from "../help-center/help-center.type";

@Injectable({
  providedIn: "root",
})
export class HelpCenterService {
  // Private
  private _faqs: BehaviorSubject<FaqCategory[] | null>;
  private _guides: BehaviorSubject<GuideCategory[] | null>;
  private _guide: BehaviorSubject<Guide | null>;

  /**
   * Constructor
   *
   * @param {HttpClient} _httpClient
   */
  constructor(private _httpClient: HttpClient) {
    // Set the private defaults
    this._faqs = new BehaviorSubject(null);
    this._guides = new BehaviorSubject(null);
    this._guide = new BehaviorSubject(null);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter for FAQs
   */
  get faqs$(): Observable<FaqCategory[]> {
    return this._faqs.asObservable();
  }

  /**
   * Getter for guides
   */
  get guides$(): Observable<GuideCategory[]> {
    return this._guides.asObservable();
  }

  /**
   * Getter for guide
   */
  get guide$(): Observable<GuideCategory> {
    return this._guide.asObservable();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get all FAQs
   */
  getAllFaqs(): Observable<FaqCategory[]> {
    return this._httpClient.get<FaqCategory[]>("api/pages/help-center/faqs").pipe(
      tap((response: any) => {
        this._faqs.next(response);
      })
    );
  }

  /**
   * Get FAQs by category using category slug
   *
   * @param slug
   */
  getFaqsByCategory(slug): Observable<FaqCategory[]> {
    return this._httpClient
      .get<FaqCategory[]>("api/pages/help-center/faqs", {
        params: { slug },
      })
      .pipe(
        tap((response: any) => {
          this._faqs.next(response);
        })
      );
  }

  /**
   * Get all guides limited per category by the given number
   *
   * @param limit
   */
  getAllGuides(limit = "4"): Observable<GuideCategory[]> {
    return this._httpClient
      .get<GuideCategory[]>("api/pages/help-center/guides", {
        params: { limit },
      })
      .pipe(
        tap((response: any) => {
          this._guides.next(response);
        })
      );
  }

  /**
   * Get guides by category using category slug
   *
   * @param slug
   */
  getGuidesByCategory(slug): Observable<GuideCategory[]> {
    return this._httpClient
      .get<GuideCategory[]>("api/pages/help-center/guides", {
        params: { slug },
      })
      .pipe(
        tap((response: any) => {
          this._guides.next(response);
        })
      );
  }

  /**
   * Get guide by category and guide slug
   *
   * @param categorySlug
   * @param guideSlug
   */
  getGuide(categorySlug, guideSlug): Observable<GuideCategory> {
    return this._httpClient
      .get<GuideCategory>("api/pages/help-center/guide", {
        params: {
          categorySlug,
          guideSlug,
        },
      })
      .pipe(
        tap((response: any) => {
          this._guide.next(response);
        })
      );
  }
}
