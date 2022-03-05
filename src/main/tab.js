const {BrowserWindow, BrowserView} = require('electron');
const fs = require('fs');
const directory = `${__dirname}/..`;
const adBlockCode = fs.readFileSync(
  `${directory}/proprietary/experimental/adBlock.js`,
  'utf-8'
);
const {LowLevelConfig} = require(`${directory}/proprietary/lib/config.js`);
const monotConfig = new LowLevelConfig('config.mncfg').copyFileIfNeeded(`${directory}/default/config/config.mncfg`);
const enginesConfig = new LowLevelConfig('engines.mncfg').copyFileIfNeeded(`${directory}/default/config/engines.mncfg`);

class Tab {
  constructor(
    url = new URL(`file://${directory}/browser/index.html`)
  ) {
    this.href = url;

    if (!(url instanceof URL)) {
      url = new URL(url);
    }
    const browserview = new BrowserView({
      backgroundColor: '#efefef',
      webPreferences: {
        scrollBounce: true,
        preload: `${directory}/preload/pages.js`
      }
    });

    // events
    browserview.webContents.on('did-fail-load', () => {
      this.webContents.loadURL(
        `file://${directory}/browser/server-notfound.html`
      );
      this.webContents.executeJavaScript(
        `document.getElementsByTagName('span')[0].innerText='${this.webContents.getURL().toLowerCase()}';`
      );
    });
    browserview.webContents.on('dom-ready', () => {

    });
    this.entity = browserview;
  }

  load(url = `file://${directory}/browser/index.html`) {
    this.entity.webContents.loadURL(url);
    this.href = url;

    // proprietary stylesheet
    this.entity.webContents.on('dom-ready', () => {
      this.entity.webContents.insertCSS(
        fs.readFileSync(
          `${directory}/proprietary/style/ua.css`,
          'utf-8'
        )
      );
      const browserURL = new URL(this.href);
      const fileURL = new URL(`file://${directory}/browser/home.html`);
      this.href = this.entity.webContents.getURL();
      if (browserURL.href === fileURL.href) {
        enginesConfig.update();
        const selectEngine = enginesConfig.get('engine');
        const engineURL = enginesConfig.get(`values.${selectEngine}`, true);
        this.entity.webContents.executeJavaScript(`
          url = '${engineURL}';
        `);
      }
      const experiments = monotConfig.update().get('experiments');
      // Force-Dark
      if (experiments.forceDark === true) {
        this.entity.webContents.insertCSS(
          fs.readFileSync(
            `${directory}/proprietary/style/forcedark.css`,
            'utf-8'
          )
        );
      }
      // fontChange
      if (experiments.fontChange === true) {
        this.entity.webContents.insertCSS(`
          body,body>*, *{
            font-family: ${experiments.changedfont},'Noto Sans JP'!important;
          }
        `);
      }
      // AD Block
      if (experiments.adBlock === true) {
        this.entity.webContents.executeJavaScript(adBlockCode);
      }
    });
    // BrowserWindow.fromBrowserView(this.entity));
    this.setTitleUrl();
  }

  // This function sets URL to the URL bar of the title bar.
  setTitleUrl() {
    const url = new URL(this.href);
    console.log(this.href);
    // If the URL is Monot build-in HTML, the URL is not set in the URL bar.
    const win = BrowserWindow.fromBrowserView(this.entity);
    const resourceIndex = new URL(`file://${__dirname}/`);
    const partOfUrl = url.href.substring(0, resourceIndex.href.length - 5);
    const partOfResourceIndex = resourceIndex.href.substring(0, resourceIndex.href.length - 5);
    const isSame = partOfUrl === partOfResourceIndex;
    if (url.href === `${partOfResourceIndex}browser/home.html`) {
      return win.webContents.executeJavaScript(`
        document.getElementsByTagName('input')[0].value='';
      `);
    } else if (isSame) {
      return Promise.resolve();
    }

    // Set URL in the URL bar.
    return win.webContents.executeJavaScript(`
      document.getElementsByTagName('input')[0].value='${url.host}${url.pathname}${url.search}${url.hash}';
    `);
  }

  setTop() {
    const win = BrowserWindow.fromBrowserView(this.entity);
    win.setTopBrowserView(this.entity);
    this.entity.setBackgroundColor('#efefef');
  }

  goBack() {
    this.entity.webContents.goBack();
    this.href = this.entity.webContents.getURL();
    this.setTitleUrl();
  }

  goForward() {
    this.entity.webContents.goForward();
    this.href = this.entity.webContents.getURL();
    this.setTitleUrl();
  }

  reload() {
    this.entity.webContents.reload();
  }
}

module.exports = {
  Tab
};
