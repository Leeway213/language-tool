import puppeteer, { Browser, launch, Page, connect } from 'puppeteer';
import { config } from './config';
import { from, Observable, of, throwError, Subject } from 'rxjs';
import { shareReplay, flatMap, map, catchError, tap, take } from 'rxjs/operators';
import child_process from 'child_process';
import { log } from '../../utils/log';



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

  private endpoint = '';

  private constructor() {
    this.browser = from(launch(config)).pipe(shareReplay());
    // this.browser = from(connect({ browserURL: 'http://localhost:54281' })).pipe(
    //   catchError(() => this.startDaemon()),
    //   flatMap(() => from(connect({ browserURL: 'http://localhost:54281' })))
    // );
    this.pages = this.browser.pipe(flatMap(b => from(b.pages())));
  }

  newPage(url: string) {
    log('creating page: ' + url, 'info');
    return this.browser.pipe(
      flatMap(b => from(b.newPage())),
      flatMap(page => this.navigate(url, page)),
      tap(() => log('page created: ' + url, 'success'))
    );
  }

  navigate(url: string, page: Page) {
    page.setDefaultTimeout(0);
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
      take(1),
    );
  }

  private browserStarted = new Subject<string>();
  private starting = false;
  private startDaemon(): Observable<string> {
    if (this.starting) {
      return this.browserStarted;
    }
    log('starting browser daemon...', 'info');
    this.starting = true;
    const child = child_process.fork(`${__dirname}/daemon.js`);
    child.unref();
    child.on('message', message => {
      this.endpoint = message;
      log('browser started', 'success');
      this.browserStarted.next(message);
      this.starting = false;
    });
    return this.browserStarted;
  }
}

// process.exit();
// BrowserDaemon.instance.browser.subscribe(async (browser) => {
//   await browser.newPage();
//   process.exit();
// });
