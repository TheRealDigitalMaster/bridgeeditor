import { App } from '@/App'
import { ToolbarCategory } from '../ToolbarCategory'

export function setupToolsCategory(app: App) {
	const tools = new ToolbarCategory(
		'mdi-wrench-outline',
		'toolbar.tools.name'
	)

	tools.addItem(
		app.actionManager.create({
			icon: 'mdi-book-open-page-variant',
			name: 'toolbar.tools.docs',
			description: 'Opens the Minecraft Add-On documentation',
			onTrigger: () =>
				App.createNativeWindow('https://bedrock.dev', 'DocWindow'),
		})
	)

	App.toolbar.addCategory(tools)
}
