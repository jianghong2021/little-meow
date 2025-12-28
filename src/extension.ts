import * as vscode from 'vscode';
import { CatParticipant } from './cat/CatParticipant';
import { CatCommand } from './cat/CatCommand';
import { ChatViewProvider } from './cat/ChatViewProvider';
import { CompletionProvider } from './cat/CompletionProvider';
import { AgentViewProvider } from './cat/AgentViewProvider';

export function activate(context: vscode.ExtensionContext) {
	//注册小喵喵机器人
	CatParticipant.init(context);
	//注册小喵喵代码补全
	CompletionProvider.init(context);
	//注册小喵喵聊天窗口
	ChatViewProvider.register(context);
	//注册小喵喵面板
	AgentViewProvider.register(context);
	
	//注册小喵喵命令
	CatCommand.init(context);
}

export function deactivate() { }
