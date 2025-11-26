import * as vscode from 'vscode';
export class CatCommand {
    public static init(context: vscode.ExtensionContext) {
        vscode.commands.registerCommand('my-lovely-cat.ask', () => {
            vscode.commands.executeCommand('workbench.view.extension.chat-my-lovely-cat-view');
        });

        vscode.commands.registerCommand('my-lovely-cat.settings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings','@my-lovely-cat.model-token');
        });
    }

}