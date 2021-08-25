import {
  isClose, sortCompareEntriesByTime, entryListToTree,
  findIntervalAtTime, findPointAtTime, doIntervalsOverlap
} from './utils';

const INTERVAL_TIER = 'IntervalTier';
const POINT_TIER = 'TextTier';
const MIN_INTERVAL_LENGTH = 0.00000001; // Arbitrary threshold

class TierExistsException extends Error {
	tierName: string;

  constructor (tierName: any, ...args: any[]) {
    super(...args);
    this.tierName = tierName;
    this.message = `Tier name ${tierName} already exists in textgrid`;
  }
};

class TierCreationException extends Error {
	errStr: string;
  constructor (errStr: string, ...args: any[]) {
    super(...args);
    this.errStr = errStr;
    this.message = "Couldn't create tier: " + errStr;
  }
};

class TextgridCollisionException extends Error {
	tierName: string;
	entry: any;
	matchList: any[];
  constructor (tierName: string, entry: any, matchList: any[], ...args: any[]) {
    super(...args);
    this.tierName = tierName;
    this.entry = entry;
    this.matchList = matchList;
    this.message = `Attempted to insert interval [${entry}] into tier '${tierName}' of textgrid but overlapping entries [${matchList}] already exist.`;
  }
};

class IndexException extends Error {
  constructor (public indexVal: number, public listLength: number, ...args: any[]) {
    super(...args);
    this.message = `Attempted to index a list of length ${listLength} with index ${indexVal}.`;
  }
};

/**
 * Abstract class for tiers.
 * @abstract
 * @hideconstructor
 */
class TextgridTier {
	tierType: any = null;
  constructor (public name: string, public entryList: any[], public minT: number, public maxT: any) {
    // Don't allow a timeless tier to exist
    if (minT === null || maxT === null) {
      throw new TierCreationException('All textgrid tiers must have a min and max timestamp');
    }

    this.name = name;
    this.entryList = entryList;
    this.sort()
  }

  /**
   * Remove an entry from the tier's entryList
   * @param {Array} entry - the entry to remove
   */
  deleteEntry (entry: any) {
    let deleteI = -1;
    for (let i = 0; i < this.entryList.length; i++) {
      if (compareEntries(this.entryList[i], entry)) {
        deleteI = i;
        break;
      }
    }

    if (deleteI === -1) {
      throw new IndexException(deleteI, this.entryList.length);
    }

    this.entryList.splice(deleteI, 1);
  }

  sort () {
    this.entryList.sort(sortCompareEntriesByTime);
  }
}

/**
 * Class representing an PointTier.
 * @augments TextgridTier
 * @inheritdoc
 */
class PointTier extends TextgridTier {
	labelIndex: number;
	minTimestamp: any;
	maxTimestamp: any;
  /**
   * @constructor
   * @param {string} name
   * @param {Array} entryList - each entry is of the form [time, label]
   * @param {number} [minT=null] - the smallest time; if null use 0
   * @param {number} [maxT=null] - the maximum length of the tier; if null use the last timestamp found in the entryList
   */
  constructor (name: any, entryList: any, minT: any = null, maxT: any = null) {
    entryList = entryList.map(([timeV, label]: any) => [parseFloat(timeV), label]);

    // Determine the min and max timestamps
    const timeList = entryList.map((entry: any) => entry[0]);
    if (minT !== null) timeList.push(parseFloat(minT));
    if (timeList.length > 0) minT = Math.min(...timeList);

    if (maxT !== null) timeList.push(parseFloat(maxT));
    if (timeList.length > 0) maxT = Math.max(...timeList);

    // Finish intialization
    super(name, entryList, minT, maxT);
    this.tierType = POINT_TIER;
    this.labelIndex = 1;
  }

  /**
   * Insert an entry into the tier
   * @param {Array} entry - of the form [time, label]
   * @param {boolean} [warnFlag=true] - if the entry collides with an existing entry, warn the user?
   * @param {string} [collisionCode=null] - the action to take if there is a collision
   */
  insertEntry (entry: any[], warnFlag = true, collisionCode: any = null) {
    const startTime = entry[0];

    let match = null;
    for (let i = 0; i < this.entryList.length; i++) {
      if (isClose(startTime, this.entryList[i][0])) {
        match = this.entryList[i];
        break;
      }
    }

    if (!match) {
      this.entryList.push(entry);
    }
    else if (collisionCode && collisionCode.toLowerCase() === 'replace') {
      this.deleteEntry(match);
      this.entryList.push(entry);
    }
    else if (collisionCode && collisionCode.toLowerCase() === 'merge') {
      const newEntry = [match[0], [match[1], entry[1]].join('-')];
      this.deleteEntry(match);
      this.entryList.push(newEntry);
    }
    else {
      throw new TextgridCollisionException(this.name, entry, match);
    }

    this.sort();

    if (match && warnFlag === true) {
      const msg = `Collision warning for [${entry}] with items [${match}] of tier '${this.name}'`;
      console.log(msg);
    }
  }
}

/**
 * Class representing an IntervalTier.
 * @augments TextgridTier
 */
class IntervalTier extends TextgridTier {
	labelIndex: number;
	minTimestamp: any;
	maxTimestamp: any;
  /**
   * @constructor
   * @param {string} name
   * @param {Array} entryList - each entry is of the form [start time, end time, label]
   * @param {number} [minT=null] - the smallest time; if null use 0
   * @param {number} [maxT=null] - the maximum length of the tier; if null use the last timestamp found in the entryList
   */
  constructor (name: string, entryList: any[], minT: any = null, maxT: any = null) {
    entryList = entryList.map(([startTime, endTime, label]) => [parseFloat(startTime), parseFloat(endTime), label]);

    // Determine the min and max timestamps
    const startTimeList = entryList.map((entry: any[]) => entry[0]);
    if (minT !== null) startTimeList.push(parseFloat(minT));
    if (startTimeList.length > 0) minT = Math.min(...startTimeList);

    const endTimeList = entryList.map((entry: any[]) => entry[1]);
    if (maxT !== null) endTimeList.push(parseFloat(maxT));
    if (endTimeList.length > 0) maxT = Math.max(...endTimeList);

    // Finish initialization
    super(name, entryList, minT, maxT);
    this.tierType = INTERVAL_TIER;
    this.labelIndex = 2;
  }

  /**
   * Insert an entry into the tier
   * @param {Array} entry - of the form [start time, end time, label]
   * @param {boolean} [warnFlag=true] - if the entry collides with an existing entry, warn the user?
   * @param {string} [collisionCode=null] - the action to take if there is a collision
   */
  insertEntry (entry: any[], warnFlag = false, collisionCode: any = null) {
    const startTime = entry[0];
    const endTime = entry[1];

    const matchList: any = getEntriesInInterval(this, startTime, endTime);

    if (matchList.length === 0) {
      this.entryList.push(entry);
    }
    else if (collisionCode && collisionCode.toLowerCase() === 'replace') {
      for (let i = 0; i < matchList.length; i++) {
        this.deleteEntry(matchList[i]);
      }
      this.entryList.push(entry);
    }
    else if (collisionCode && collisionCode.toLowerCase() === 'merge') {
      for (let i = 0; i < matchList.length; i++) {
        this.deleteEntry(matchList[i]);
      }
      matchList.push(entry);
      matchList.sort(sortCompareEntriesByTime);

      const startTimes = matchList.map((entry: any[]) => entry[0]);
      const endTimes = matchList.map((entry: any[]) => entry[1]);
      const labels = matchList.map((entry: any[]) => entry[2]);

      const newEntry = [
        Math.min(...startTimes),
        Math.max(...endTimes),
        labels.join('-')
      ]

      this.entryList.push(newEntry);
    }
    else {
      throw new TextgridCollisionException(this.name, entry, matchList);
    }

    this.sort();

    if (matchList && warnFlag === true) {
      const msg = `Collision warning for [${entry}] with items [${matchList}] of tier '${this.name}'`;
      console.log(msg);
    }
  }
}

/**
 * Class representing a Textgrid.<br /><br />
 * A Textgrid is a container for annotations of an audio
 * file.  Annotations can be split into multiple tiers that
 * might represent different things (different speakers or
 * categories of events, etc). <br /><br />
 *
 * A Textgrid allows one to compute operations that affect
 * all of the contained tiers.
 */
class Textgrid {
	tierNameList: any[];
	tierDict: any;
	minTimestamp: any;
	maxTimestamp: any;
  constructor () {
    this.tierNameList = [];
    this.tierDict = {};

    this.minTimestamp = null;
    this.maxTimestamp = null;
  }

  /**
   * Adds a tier to the textgrid.  Added to the end, unless an index is specified.
   * @param {TextgridTier} tier
   * @param {number} [tierIndex=null] - The index to insert at.  If null, add it to the end.
   */
  addTier (tier: { name: string; minTimestamp: any; maxTimestamp: any; }, tierIndex: any = null) {
    if (Object.keys(this.tierDict).includes(tier.name)) {
      throw new TierExistsException(tier.name);
    }

    if (tierIndex === null) this.tierNameList.push(tier.name);
    else this.tierNameList.splice(tierIndex, 0, tier.name);

    this.tierDict[tier.name] = tier;

    if (this.minTimestamp === null) {
      this.minTimestamp = tier.minTimestamp;
    }
    if (this.maxTimestamp === null) {
      this.maxTimestamp = tier.maxTimestamp;
    }
    this._homogonizeMinMaxTimestamps();
  }

  /**
   * Makes all min and max timestamps within a textgrid the same
   * @ignore
   */
  _homogonizeMinMaxTimestamps () {
    const minTimes = this.tierNameList.map((tierName: string | number) => this.tierDict[+tierName].minT || 0);
    const maxTimes = this.tierNameList.map((tierName: string | number) => this.tierDict[+tierName].maxT || 0);

    const minTimestamp = Math.min(...minTimes);
    const maxTimestamp = Math.max(...maxTimes);

    this.minTimestamp = minTimestamp;
    for (let i = 0; i < this.tierNameList.length; i++) {
      const tierName = this.tierNameList[i];
      this.tierDict[tierName].minTimestamp = minTimestamp;
    }

    this.maxTimestamp = maxTimestamp;
    for (let i = 0; i < this.tierNameList.length; i++) {
      const tierName = this.tierNameList[i];
      this.tierDict[tierName].maxTimestamp = maxTimestamp;
    }
  }

  /**
   * Renames one tier.  The new name must not exist in the textgrid already.
   * @param {string} oldName
   * @param {string} newName
   */
  renameTier (oldName: string | number, newName: string) {
    if (Object.keys(this.tierDict).includes(newName)) {
      throw new TierExistsException(newName);
    }

    const oldTier = this.tierDict[oldName];
    const tierIndex = this.tierNameList.indexOf(oldName);
    const newTier = copyTier(oldTier, { name: newName });

    this.removeTier(oldName);
    this.addTier(newTier, tierIndex);
  }

  /**
   * Removes the given tier from this textgrid.
   * @param {string} name
   */
  removeTier (name: string | number) {
    this.tierNameList.splice(this.tierNameList.indexOf(name), 1);
    delete this.tierDict[name];
  }

  /**
   * Replace the tier with the given name with a new tier
   * @param {string} name
   * @param {TextgridTier} newTier
   */
  replaceTier (name: any, newTier: any) {
    const tierIndex = this.tierNameList.indexOf(name);
    this.removeTier(name);
    this.addTier(newTier, tierIndex);
  }
}

/**
 * Returns true if the two textgrids are the same, false otherwise
 * @param {Textgrid} tg1
 * @param {Textgrid} tg2
 * @return {boolean}
 */
function compareTextgrids (tg1: { minTimestamp: number; maxTimestamp: number; tierNameList: string | any[]; tierDict: { [x: string]: any; }; }, tg2: { minTimestamp: number; maxTimestamp: number; tierNameList: string | any[]; tierDict: { [x: string]: any; }; }) {
  let isEqual: any = true;
  isEqual &= isClose(tg1.minTimestamp, tg2.minTimestamp) as any;
  isEqual &= isClose(tg1.maxTimestamp, tg2.maxTimestamp) as any;
  isEqual &= (tg1.tierNameList.length === tg2.tierNameList.length) as any;
  for (let i = 0; i < tg1.tierNameList.length; i++) {
    isEqual &= (tg1.tierNameList[i] === tg2.tierNameList[i]) as any;
  }

  for (let i = 0; i < tg1.tierNameList.length; i++) {
    const tierName = tg1.tierNameList[i];
    isEqual &= (compareTiers(tg1.tierDict[tierName], tg2.tierDict[tierName])) as any;
  }

  return !!isEqual;
}

/**
 * Returns true if the two tiers are the same, false otherwise
 * @param {TextgridTier} tier1
 * @param {TextgridTier} tier2
 * @return {boolean}
 */
function compareTiers (tier1: { name: any; minTimestamp: number; maxTimestamp: number; entryList: string | any[]; }, tier2: { name: any; minTimestamp: number; maxTimestamp: number; entryList: string | any[]; }) {
  let isEqual: any = true;
  isEqual &= (tier1.name === tier2.name) as any;
  isEqual &= isClose(tier1.minTimestamp, tier2.minTimestamp) as any;
  isEqual &= isClose(tier1.maxTimestamp, tier2.maxTimestamp) as any;
  isEqual &= (tier1.entryList.length === tier2.entryList.length) as any;

  if (isEqual) {
    for (let i = 0; i < tier1.entryList.length; i++) {
      isEqual &= compareEntries(tier1.entryList[i], tier2.entryList[i]) as any;
    }
  }

  return !!isEqual;
}

/**
 * Returns true if the two entries are the same, false otherwise
 * @param {Array} entryA
 * @param {Array} entryB
 * @return {boolean}
 */
function compareEntries (entryA: any, entryB: any) {
  let areEqual;
  if (entryA.length === 2) {
    areEqual = comparePoints(entryA, entryB);
  } else if (entryA.length === 3) {
    areEqual = compareIntervals(entryA, entryB);
  }
  return areEqual
}

function comparePoints (pointA: any[], pointB: any[]) {
  let areEqual: any = true;
  areEqual &= isClose(pointA[0], pointB[0]) as any;
  areEqual &= (pointA[1] === pointB[1]) as any;
  return !!areEqual;
}

function compareIntervals (intervalA: any[], intervalB: any[]) {
  let areEqual: any = true;
  areEqual &= isClose(intervalA[0], intervalB[0]) as any;
  areEqual &= isClose(intervalA[1], intervalB[1]) as any;
  areEqual &= (intervalA[2] === intervalB[2]) as any;
  return !!areEqual
}

/**
 * Returns a deep copy of a textgrid.
 * @param {Textgrid} tg
 * @return {Textgrid}
 */
function copyTextgrid (tg: { tierNameList: string | any[]; tierDict: { [x: string]: any; }; minTimestamp: any; maxTimestamp: any; }) {
  const textgrid = new Textgrid();
  for (let i = 0; i < tg.tierNameList.length; i++) {
    const tierName = tg.tierNameList[i];
    textgrid.addTier(copyTier(tg.tierDict[tierName]));
  }

  textgrid.minTimestamp = tg.minTimestamp;
  textgrid.maxTimestamp = tg.maxTimestamp;

  return textgrid;
}

/**
 * Returns a deep copy of a tier
 * @param {TextgridTier} tier
 * @param {Object} - an object containing optional values to replace those in the copy.  If the four paramaters name, entryList, minTimestamp, and maxTimestamp are null or not specified, those in the tier will be used (default behaviour).
 * @return {TextgridTier}
 */
function copyTier (tier: { name: any; entryList: { map: (arg0: (entry: any) => any) => null; }; minTimestamp: any; maxTimestamp: any; constructor: new (arg0: any, arg1: any, arg2: any, arg3: any) => any; }, {
  name = null as any,
  entryList = null as any,
  minTimestamp = null as any,
  maxTimestamp = null as any
} = {}) {
  if (name === null) name = tier.name;
  if (entryList === null) entryList = tier.entryList.map((entry: string | any[]) => entry.slice());
  if (minTimestamp === null) minTimestamp = tier.minTimestamp;
  if (maxTimestamp === null) maxTimestamp = tier.maxTimestamp;

  return new tier.constructor(name, entryList, minTimestamp, maxTimestamp);
}

/**
 * Get the values that occur at points in the point tier.
 * @param {PointTier} pointTier
 * @param {Array} dataTupleList - should be ordered in time;
 *  must be of the form [(t1, v1a, v1b, ..), (t2, v2a, v2b, ..), ..]
 * @return {Array}
 */
function getValuesAtPoints (pointTier: { entryList: any[]; }, dataTupleList: string | any[]) {
  const searchTree = entryListToTree(pointTier.entryList);

  const returnList = [];
  for (let i = 0; i < dataTupleList.length; i++) {
    const currentEntry = dataTupleList[i];
    if (findPointAtTime(currentEntry[0], searchTree, false) !== null) {
      returnList.push(currentEntry);
    }
  }

  return returnList;
}

/**
 * Returns data from dataTupleList contained in labeled intervals
 * @params {IntervalTier} intervalTier
 * @params {Array} dataTupleList  - should be of the form: [(time1, value1a, value1b,..), (time2, value2a, value2b..), ..]
 * @return {Array}
 */
function getValuesInIntervals (intervalTier: { entryList: any[]; }, dataTupleList: string | any[]) {
  const searchTree = entryListToTree(intervalTier.entryList);

  const returnList = [];
  for (let i = 0; i < dataTupleList.length; i++) {
    const currentEntry = dataTupleList[i];
    if (findIntervalAtTime(currentEntry[0], searchTree) !== null) {
      returnList.push(currentEntry);
    }
  }

  return returnList;
}

/**
 * Given an interval, returns entries in an interval tier that are in or (for intervals) that partially overlap with it
 * @params {TextgridTier} tier
 * @params {number} startTime
 * @params {number} endTime
 * @return {Array} entryList
 */
function getEntriesInInterval (tier: any, startTime: any, endTime: any) {
  let entryList
  if (tier instanceof PointTier) {
    entryList = getPointTierEntriesInInterval(tier, startTime, endTime);
  }
  else if (tier instanceof IntervalTier) {
    entryList = getIntervalTierEntriesInInterval(tier, startTime, endTime);
  }
  return entryList;
}

function getIntervalTierEntriesInInterval (intervalTier: IntervalTier, startTime: number, endTime: number) {
  const entryList = [];
  for (let i = 0; i < intervalTier.entryList.length; i++) {
    const entry = intervalTier.entryList[i];
    if (doIntervalsOverlap([startTime, endTime], entry)) {
      entryList.push(entry);
    }
  }
  return entryList;
}

function getPointTierEntriesInInterval (pointTier: PointTier, startTime: number, endTime: number) {
  const entryList = [];
  for (let i = 0; i < pointTier.entryList.length; i++) {
    const entry = pointTier.entryList[i];
    if (entry[0] >= startTime && entry[0] <= endTime) {
      entryList.push(entry);
    }
  }
  return entryList;
}

/**
 * Returns the regions of the textgrid without labels
 * @params {IntervalTier} intervalTier
 * @return {Array} invertedEntryList - where each entry looks like [start time, end time, '']
 */
function getNonEntriesFromIntervalTier (intervalTier: { entryList: string | any[]; minTimestamp: any; maxTimestamp: number; }) {
  const invertedEntryList = [];

  // Special case--the entry list is empty
  if (intervalTier.entryList.length === 0) return [[intervalTier.minTimestamp, intervalTier.maxTimestamp, '']];

  if (intervalTier.entryList[0][0] > 0) {
    invertedEntryList.push([0, intervalTier.entryList[0][0], '']);
  }

  for (let i = 0; i < intervalTier.entryList.length - 1; i++) {
    const currEnd = intervalTier.entryList[i][1];
    const nextStart = intervalTier.entryList[i + 1][0];
    if (currEnd !== nextStart) {
      invertedEntryList.push([currEnd, nextStart, '']);
    }
  }

  const lastI = intervalTier.entryList.length - 1;
  if (intervalTier.entryList[lastI][1] < intervalTier.maxTimestamp) {
    invertedEntryList.push([intervalTier.entryList[lastI][1], intervalTier.maxTimestamp, '']);
  }

  return invertedEntryList;
}

/**
 * Returns the indexes of the entries that match the search label
 * @params {TextgridTier} tier
 * @params {string} searchLabel
 * @params {string} [mode=null] If null, look for exact matches; if 're', match using regular expressions; if 'substr' look for substring matches
 * @return {Array}
 */
function findLabelInTier (tier: { entryList: string | any[]; labelIndex: string | number; }, searchLabel: any, mode = null) {
  let cmprFunc;
  if (mode === 're') {
    cmprFunc = (text: string, reStr: string | RegExp) => { return RegExp(reStr).test(text) };
  }
  else if (mode === 'substr') {
    cmprFunc = (text: string | any[], subStr: any) => { return text.includes(subStr) };
  }
  else {
    cmprFunc = (text: any, searchText: any) => { return text === searchText };
  }

  // Run the search
  const returnList = [];
  for (let i = 0; i < tier.entryList.length; i++) {
    if (cmprFunc(tier.entryList[i][tier.labelIndex], searchLabel)) returnList.push(i);
  }
  return returnList;
}

export {
  Textgrid, IntervalTier, PointTier,
  // functions that compare
  compareTextgrids, compareTiers, compareEntries,
  comparePoints, compareIntervals,
  // deep copy functions
  copyTextgrid, copyTier,
  // query functions
  getValuesAtPoints, getValuesInIntervals, getEntriesInInterval,
  getNonEntriesFromIntervalTier, findLabelInTier,
  // exceptions
  TierExistsException, TierCreationException, TextgridCollisionException,
  IndexException,
  // constants
  INTERVAL_TIER, POINT_TIER, MIN_INTERVAL_LENGTH
};
