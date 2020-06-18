import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {AppContainer} from 'react-hot-loader';

let render = () => {
    const { App } = require('./app');
    ReactDOM.render(<AppContainer><App /></AppContainer>, document.getElementById('App'));
}

render();
if ((module as any).hot) { (module as any).hot.accept(render); }