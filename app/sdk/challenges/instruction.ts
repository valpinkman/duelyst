/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsJavascript = require('app/common/utils/utils_javascript');
const Validator = require('../validators/validator');
const EndTurnAction = require('app/sdk/actions/endTurnAction');
const _ = require('underscore');
const i18next = require('i18next');

class Instruction extends Validator {
  declare type: any;
  declare triggerStepIndex: any;
  declare isComplete: any;
  declare failedLabel: any;
  declare showFailureOnSource: any;
  declare sourcePosition: any;
  declare targetPosition: any;
  declare handIndex: any;
  declare instructionArrowPositions: any;
  declare persistentInstructionArrowPosition: any;
  declare preventSelectionUntilLabelIndex: any;
  declare disableReadiness: any;
  declare generalSpeech: any;
  declare generalSpeechYPosition: any;
  declare instructionLabels: any;
  declare expectedActionType: any;

  static type = 'Instruction';

  /**
   * Instruction constructor.
   * @param  {Object}  params  Parameters that will get copied into this object to override the default properties.
   * @public
   */
  constructor(params) {
    super();

    UtilsJavascript.fastExtend(this, params);
  }

  /**
   * Check if a specified board position is valid as this instruction's source position.
   * @param  {Point}  p  Position to compare with source.
   * @public
   */
  isValidSourcePosition(p) {
    return (
      this.sourcePosition == null ||
      (p.x === this.sourcePosition.x && p.y === this.sourcePosition.y)
    );
  }

  /**
   * Check if a specified board position is valid as this instruction's target position.
   * @param  {Point}  p  Position to compare with target.
   * @public
   */
  isValidTargetPosition(p) {
    return (
      this.targetPosition == null ||
      (p.x === this.targetPosition.x && p.y === this.targetPosition.y)
    );
  }

  /**
   * Check if a specified hand index is valid as this instruction's required hand index
   * @param  {integer}  handIndex  handIndex to compare with required handIndex of instruction
   * @public
   */
  isValidHandIndex(handIndex) {
    return this.handIndex == null || this.handIndex === handIndex;
  }

  /**
   * Called when an action is executed on the .
   * @param  {Point}  p  Position to compare with target.
   * @public
   */
  onValidateAction(e) {
    super.onValidateAction(e);
    const { action } = e;
    if (
      action != null &&
      action.getIsValid() &&
      !action.getIsImplicit() &&
      !action.getIsAutomatic()
    ) {
      if (
        action.type === this.expectedActionType &&
        this.isValidTargetPosition(action.targetPosition) &&
        this.isValidSourcePosition(action.sourcePosition) &&
        this.isValidHandIndex(action.indexOfCardInHand)
      ) {
        return action.setIsValid(true);
      }
      return this.invalidateAction(action, this._getFailureMessagePosition(), this.failedLabel);
    }
  }

  _getFailureMessagePosition() {
    // first rely on the existence of source position, defaults to target position of no source
    if (!this.sourcePosition) {
      return this.targetPosition;
    }

    if (this.showFailureOnSource) {
      return this.sourcePosition;
    }
    return this.targetPosition;
  }

  static createEndTurnInstruction() {
    const endTurnInstruction = new Instruction({
      //      failedLabel:"Click Here."
      failedLabel: i18next.t('tutorial.end_your_turn_message'),
      expectedActionType: EndTurnAction.type,
      instructionLabels: [
        {
          label: i18next.t('tutorial.end_your_turn_message'),
          positionAtEndTurn: true,
          triggersInstructionIndex: 0,
          delay: CONFIG.INSTRUCTIONAL_ULTRAFAST_DURATION,
          duration: CONFIG.INSTRUCTIONAL_SHORT_DURATION,
        },
      ],
    });

    return endTurnInstruction;
  }

  // legacy - remove once there is less churn on tutorial
  //  @getPositionForEndTurn: () ->
  //    return {x:8.9,y:-.25}
  //
  //  @getPositionForManaBar: () ->
  // #    return {x:-1,y:2.5}
  //    return {x:-1,y:3.5} # points to 3rd mana crystal
  //
  //  @getPositionForReplace: () ->
  // #    return {x:-1.5,y:-.5}
  //    return {x:-1.5,y:-.5}

  // TODO: either tie to cardnode or use real pixel values
  static getPositionForHandIndex(index) {
    //    return {x:index*7/5,y:-1}
    return { x: -0.1 + (index * 7) / 5, y: -0.25 };
  }
}
Instruction.prototype.type = 'Instruction';
Instruction.prototype.triggerStepIndex = null;
Instruction.prototype.isComplete = false;
Instruction.prototype.failedLabel = 'Invalid move';
Instruction.prototype.showFailureOnSource = false;
Instruction.prototype.sourcePosition = null;
Instruction.prototype.targetPosition = null;
Instruction.prototype.handIndex = null;
Instruction.prototype.instructionArrowPositions = null;
Instruction.prototype.persistentInstructionArrowPosition = null;
Instruction.prototype.preventSelectionUntilLabelIndex = null;
Instruction.prototype.disableReadiness = false;
Instruction.prototype.generalSpeech = null;
Instruction.prototype.generalSpeechYPosition = null;
Instruction.prototype.instructionLabels = null;
Instruction.prototype.expectedActionType = null;

module.exports = Instruction;
