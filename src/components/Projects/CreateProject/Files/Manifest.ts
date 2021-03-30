import { FileSystem } from '/@/components/FileSystem/FileSystem'
import { ICreateProjectOptions } from '/@/components/Projects/CreateProject/CreateProject'
import { TPackType } from '/@/components/Projects/CreateProject/Packs/Pack'
import { CreateFile } from './CreateFile'
import { v4 as uuid } from 'uuid'

export class CreateManifest extends CreateFile {
	constructor(protected pack: TPackType) {
		super()
	}

	get type() {
		switch (this.pack) {
			case 'BP':
				return 'data'
			case 'RP':
				return 'resources'
			case 'SP':
				return 'skin_pack'
		}
	}

	create(fs: FileSystem, createOptions: ICreateProjectOptions) {
		// Base manifest
		const manifest: any = {
			format_version: 2,
			header: {
				name: 'pack.name',
				description: 'pack.description',
				min_engine_version:
					this.type === 'data' || 'resources'
						? createOptions.targetVersion
								.split('.')
								.map((str) => Number(str))
						: undefined,
				uuid: uuid(),
				version: [1, 0, 0],
			},
			modules: [
				{
					description: createOptions.description,
					type: this.type,
					uuid: uuid(),
					version: [1, 0, 0],
				},
			],
		}

		// Register the resource pack as a dependency of the BP
		if (
			createOptions.rpAsBpDependency &&
			createOptions.packs.includes('RP')
		) {
			if (this.type === 'resources') {
				createOptions.rpUuid = manifest.header.uuid
			} else if (this.type === 'data') {
				if (!createOptions.rpUuid)
					throw new Error(
						`Trying to register RP uuid before it was defined`
					)

				manifest.dependencies = [
					{ uuid: createOptions.rpUuid, version: [1, 0, 0] },
				]
			}
		}

		// Behavior pack modules
		if (this.type === 'data' && createOptions.scripting) {
			manifest.modules.push({
				type: 'client_data',
				uuid: uuid(),
				version: [1, 0, 0],
			})
		}
		if (this.type === 'data' && createOptions.gameTest) {
			manifest.modules.push({
				type: 'plugin',
				uuid: uuid(),
				entry: 'scripts/gametests/Main.js',
				version: [1, 0, 0],
			})
		}

		return fs.writeJSON(`${this.pack}/manifest.json`, manifest, true)
	}
}
