import * as vscode from 'vscode';
import { CatParticipant } from './cat/CatParticipant';
import { CatCommand } from './cat/CatCommand';
import { ChatViewProvider } from './cat/ChatViewProvider';

export function activate(context: vscode.ExtensionContext) {
	//注册小喵喵机器人
	CatParticipant.init(context);
	//注册小喵喵聊天窗口
	ChatViewProvider.register(context);
	
	//注册小喵喵命令
	CatCommand.init(context);
}

export function deactivate() { }
