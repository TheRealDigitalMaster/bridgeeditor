import { FileType, IMonacoSchemaArrayEntry } from '@/components/Data/FileType'
import { FileSystem } from '@/components/FileSystem/Main'

type TStore = Record<string, Record<string, IStoreEntry>>
interface IStoreEntry {
	lastModified: number
	data?: Record<string, string[]>
}

/**
 * Implements the lightning cache interaction with the file system
 */
export class LightningStore {
	protected store: TStore | undefined
	protected fs: FileSystem
	constructor(fs: FileSystem) {
		this.fs = fs
	}

	reset() {
		this.store = {}
	}
	async setup() {
		let loadStore: string[] = []
		try {
			loadStore = (
				await this.fs
					.readFile('bridge/.lightningCache')
					.then(file => file.text())
			).split('\n')
		} catch {}

		this.store = {}
		let currentFileType = 'unknown'
		for (const definition of loadStore) {
			if (definition === '') continue
			else if (definition[0] === '#') {
				currentFileType = definition.slice(1)
				this.store[currentFileType] = {}
				continue
			}

			const [filePath, lastModified, data] = definition.split(' ')
			this.store[currentFileType][filePath] = {
				lastModified: Number(lastModified),
				data: data ? JSON.parse(data) : undefined,
			}
		}
	}
	async saveStore() {
		let saveStore = ''
		for (const fileType in this.store) {
			saveStore += `#${fileType}\n`

			for (const filePath in this.store[fileType]) {
				const entry = this.store[fileType][filePath]

				saveStore += `${filePath} ${entry.lastModified}`
				if (entry.data) saveStore += ` ${JSON.stringify(entry.data)}\n`
				else saveStore += '\n'
			}
		}

		await this.fs.mkdir('bridge')
		await this.fs.writeFile('bridge/.lightningCache', saveStore)
	}

	add(
		filePath: string,
		{
			lastModified,
			data,
		}: IStoreEntry & { data?: Record<string, string[]> },
		fileType = FileType.getId(filePath)
	) {
		if (!this.store![fileType]) this.store![fileType] = {}

		this.store![fileType][filePath] = {
			lastModified,
			data: data ?? this.store![fileType]?.[filePath]?.data,
		}
	}

	getLastModified(filePath: string, fileType = FileType.getId(filePath)) {
		return this.store![fileType]?.[filePath]?.lastModified
	}

	find(
		findFileType: string,
		whereCacheKey: string,
		matchesOneOf: string[],
		fetchAll = false
	) {
		if (matchesOneOf.length === 0) return []
		const relevantStore = this.store![findFileType]

		const resultingFiles: string[] = []

		// Iterating over files
		for (const filePath in relevantStore) {
			const cacheEntries =
				relevantStore[filePath].data?.[whereCacheKey] ?? []

			if (cacheEntries.find(entry => matchesOneOf.includes(entry))) {
				if (!fetchAll) return [filePath]
				else resultingFiles.push(filePath)
			}
		}

		return resultingFiles
	}
	findMultiple(
		findFileTypes: string[],
		whereCacheKey: string,
		matchesOneOf: string[],
		fetchAll = false
	) {
		const resultingFiles: string[] = []

		for (const findFileType of findFileTypes) {
			const foundFiles = this.find(
				findFileType,
				whereCacheKey,
				matchesOneOf,
				fetchAll
			)
			if (foundFiles.length > 0 && !fetchAll) return foundFiles

			resultingFiles.push(...foundFiles)
		}

		return resultingFiles
	}

	async forEach(
		fileType: string,
		cb: (filePath: string, storeEntry: IStoreEntry) => Promise<void> | void
	) {
		const relevantStore = this.store![fileType]

		const promises: (void | Promise<void>)[] = []
		for (const filePath in relevantStore) {
			promises.push(cb(filePath, relevantStore[filePath]))
		}

		await Promise.all(promises)
	}

	get(filePath: string, fileType = FileType.getId(filePath)) {
		return this.store![fileType]?.[filePath] ?? {}
	}

	allFiles() {
		const filePaths = []

		for (const fileType in this.store) {
			for (const filePath in this.store[fileType]) {
				filePaths.push(filePath)
			}
		}

		return filePaths
	}

	getAllFrom(fileType: string, fromFilePath?: string) {
		const collectedData: Record<string, string[]> = {}

		for (const filePath in this.store![fileType] ?? {}) {
			if (fromFilePath && fromFilePath !== filePath) continue

			const cachedData =
				(this.store![fileType][filePath] ?? {}).data ?? {}

			for (const cacheKey in cachedData) {
				if (collectedData[cacheKey])
					collectedData[cacheKey].push(...cachedData[cacheKey])
				else collectedData[cacheKey] = [...cachedData[cacheKey]]
			}
		}

		return collectedData
	}

	async getSchemasFor(fileType: string, fromFilePath?: string) {
		const collectedData = await this.getAllFrom(fileType, fromFilePath)
		const baseUrl = 'file:///data/packages/schema/dynamic'
		const schemas: IMonacoSchemaArrayEntry[] = []

		for (const key in collectedData) {
			schemas.push({
				uri: `${baseUrl}/${fileType}/${
					fromFilePath ? 'currentContext/' : ''
				}${key}Enum.json`,
				schema: {
					type: 'string',
					enum: collectedData[key],
				},
			})

			schemas.push({
				uri: `${baseUrl}/${fileType}/${
					fromFilePath ? 'currentContext/' : ''
				}${key}Property.json`,
				schema: {
					properties: Object.fromEntries(
						collectedData[key].map(d => [d, {}])
					),
				},
			})
		}

		return schemas
	}
}
