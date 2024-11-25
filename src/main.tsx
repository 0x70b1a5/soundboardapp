import { render } from 'preact';
import { App } from './App';
import 'uno.css';

render(<App />, document.getElementById('app') as HTMLElement);
