export interface IDetectedLanguage {
	languageCode: string;
	confidence: number;
}

export interface IOcrProperty {
	detectedLanguages: IDetectedLanguage[];
}

export interface IOcrBbox {
	normalizedVertices: [{x: number, y: number}, {x: number, y: number}, {x: number, y: number}, {x: number, y: number}];
}

export interface IDetectedBreak {
	type?: 'SPACE' | 'LINE_BREAK' | 'EOL_SURE_SPACE' | 'SURE_SPACE';
}

export interface IOcrSymbol {
	property?: IOcrProperty & IDetectedBreak;
	text: string;
	confidence: number;
}

export interface IOcrWord {
	property: IOcrProperty;
	boundingBox: IOcrBbox;
	symbols: IOcrSymbol[];
	confidence: number;
}

export interface IOcrParagraph {
	property: IOcrProperty;
	boundingBox: IOcrBbox;
	words: IOcrWord[];
	confidence: number;
}


export interface IOcrBlock {
	property: {
		detectedLanguages: IDetectedLanguage[];
	};
	blockType: string;
	confidence: number;
	paragraphs: IOcrParagraph[];
}


export interface IOcrPage {
	property: {
		detectedLanguages: IDetectedLanguage[];
	};
	width: number;
	height: number;
	blocks: IOcrBlock[];
}

export interface IOcrResponse {
	fullTextAnnotation?: {
		pages: IOcrPage[],
		text: string;
	};
	context: {
		uri: string;
		pageNumber: number;
	}
}

export interface IOcrResult {
	inputConfig: {
		gcsSource: {
			uri: string;
		},
		mimeType: string;
	};
	responses: IOcrResponse[];
}
