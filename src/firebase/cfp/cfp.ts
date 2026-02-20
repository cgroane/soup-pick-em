import { FirebaseDB } from '..';
import { CFPBracket } from '../../model';

class FirebaseCFPClass extends FirebaseDB<CFPBracket> {
  constructor() { super('cfpBracket') }
  getBracket = async (year: number) => {
    try {
      const bracket = await this.getDocumentInCollection(`cfp-${year}`)
      return bracket;
    } catch (err) {
      console.error(err);
      return undefined;
    }

  }
  saveBracket = (data: CFPBracket) => {
    try {
      this.addDocument(data, `cfp-${data.year}`)
    } catch (err) {
      console.error(err)
    }
  }
}

export const FirebaseCFPInstance = new FirebaseCFPClass();
