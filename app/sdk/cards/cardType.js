/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class CardType {
  static Card = 1;
  static Entity = 2;
  static Unit = 3;
  static Spell = 4;
  static Tile = 5;
  static Artifact = 6;

  static getIsEntityCardType(cardType) {
    return (cardType === CardType.Entity) || (cardType === CardType.Unit) || (cardType === CardType.Tile);
  }

  static getIsUnitCardType(cardType) {
    return cardType === CardType.Unit;
  }

  static getIsTileCardType(cardType) {
    return cardType === CardType.Tile;
  }

  static getIsSpellCardType(cardType) {
    return cardType === CardType.Spell;
  }

  static getIsArtifactCardType(cardType) {
    return cardType === CardType.Artifact;
  }

  static getAreCardTypesEqual(cardTypeA, cardTypeB) {
    if (cardTypeA === cardTypeB) {
      return true;
    } if (cardTypeA === CardType.Entity) {
      return (cardTypeB === CardType.Unit) || (cardTypeB === CardType.Tile);
    } if (cardTypeB === CardType.Entity) {
      return (cardTypeA === CardType.Unit) || (cardTypeA === CardType.Tile);
    }
  }

  static getNameForCardType(cardType) {
    if (this.getIsArtifactCardType(cardType)) {
      return 'Artifact';
    } if (this.getIsSpellCardType(cardType)) {
      return 'Spell';
    } if (this.getIsTileCardType(cardType)) {
      return 'Tile';
    } if (this.getIsUnitCardType(cardType)) {
      return 'Unit';
    } if (this.getIsEntityCardType(cardType)) {
      return 'Entity';
    }
    return 'Card';
  }
}

module.exports = CardType;
