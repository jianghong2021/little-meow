import { render } from 'solid-js/web';
import Agent from './views/Agent.jsx';

const vscode = acquireVsCodeApi();
(window as any)['vscode'] = vscode;

const appBox = document.getElementById('app');
render(()=><Agent/>, appBox!);