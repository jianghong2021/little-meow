import { render } from 'solid-js/web';
import Chat from './views/Chat.jsx';

const vscode = acquireVsCodeApi();
(window as any)['vscode'] = vscode;

const appBox = document.getElementById('app');
render(()=><Chat/>, appBox!);