import puppeteer, { Browser, launch, Page } from 'puppeteer';
import { config } from './config';
import { from, Observable, of, throwError } from 'rxjs';
import { shareReplay, flatMap, map, filter, defaultIfEmpty, catchError, tap } from 'rxjs/operators';

export class BrowserDaemon {

  private static _instance: BrowserDaemon;

  static get instance() {
    if (!BrowserDaemon._instance) {
      BrowserDaemon._instance = new BrowserDaemon();
    }
    return BrowserDaemon._instance;
  }

  browser: Observable<Browser>;

  pages: Observable<Page[]>;

  private constructor() {
    this.browser = from(launch(config)).pipe(shareReplay());
    this.pages = this.browser.pipe(flatMap(b => from(b.pages())));
  }

  newPage(url: string) {
    return this.browser.pipe(
      flatMap(b => from(b.newPage())),
      flatMap(page => this.navigate(url, page))
    );
  }

  navigate(url: string, page: Page) {
    return from(page.goto(url)).pipe(
      flatMap(res => res && res.ok() ? of(page) : throwError(false))
    );
  }

  useExists(url: string) {
    return this.pages.pipe(
      map(pages => pages.find(page => page.url() === url)),
      flatMap(page => page ? of(page) : throwError(false)),
    );
  }

  open(url: string, useExists = true) {
    return of(useExists).pipe(
      flatMap(use => use ? this.useExists(url).pipe(catchError(() => this.newPage(url))) : this.newPage(url)),
    );
  }
}

const instance = BrowserDaemon.instance;
instance.open('https://www.baidu.com/').subscribe((page) => {
  debugger
});

