const AGENT_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'edit_document',
            description: '编辑当前打开的源文件源码,根据用户需求修改代码后返回完整源码',
            parameters: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: '修改后的完整源码,必须包含对源码的所有修改'
                    },
                    description: {
                        type: 'string',
                        description: '简要说明修改了什么内容,一句话概括'
                    }
                },
                required: ['content', 'description']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_document',
            description: '创建新的源文件,根据用户需求生成全新的完整源码',
            parameters: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: '生成的全新完整源码'
                    },
                    description: {
                        type: 'string',
                        description: '简要说明此文件的用途,一句话概括'
                    }
                },
                required: ['content', 'description']
            }
        }
    }
];

export function getAgentTools() {
    return AGENT_TOOLS;
}

export function parseAgentToolResponse(data: any): AgentMessage {
    const msg: AgentMessage = {
        content: '',
        description: '',
        instruction: 'editDocument',
        prompt: ''
    };

    try {
        const choice = data.choices?.[0];
        if (!choice) {
            msg.error = 'AI未能生成有效响应';
            return msg;
        }

        const message = choice.message;
        const toolCalls = message?.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            const fn = toolCall.function;
            const args = JSON.parse(fn.arguments || '{}');

            if (fn.name === 'create_document') {
                msg.instruction = 'createDocument';
            } else {
                msg.instruction = 'editDocument';
            }

            msg.content = args.content || '';
            msg.description = args.description || '';
        } else if (message?.content) {
            // Fallback: AI returned plain text instead of tool call
            msg.content = message.content.replaceAll(/```(\w+)?/g, '');
            msg.description = 'AI直接输出';
            msg.instruction = 'createDocument';
        } else {
            msg.error = 'AI未能调用工具';
        }
    } catch (err: any) {
        msg.error = err.message || '解析工具调用结果失败';
    }

    return msg;
}
