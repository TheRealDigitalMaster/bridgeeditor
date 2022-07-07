import { FileWrapper } from '/@/components/UIElements/DirectoryViewer/FileView/FileWrapper'
import { App } from '/@/App'

export const OpenInSplitScreenAction = (fileWrapper: FileWrapper) => ({
	icon: 'mdi-arrow-split-vertical',
	name: 'actions.openInSplitScreen.name',
	description: 'actions.openInSplitScreen.description',
	onTrigger: async () => {
		const app = await App.getApp()

		app.project.openFile(fileWrapper.handle, {
			openInSplitScreen: true,
		})
	},
})
