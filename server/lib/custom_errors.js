/*
 * Custom Error Classes
 *
 * Hand-converted from CoffeeScript (decaffeinate refused: `this` before
 * `super`). Same name/status/description/message contract; captureStackTrace
 * runs after super, still excluding the constructor frame.
 *
 * @module custom_errors
 */

class NotFoundError extends Error {
  constructor(message = 'Not Found.') {
    super(message);
    this.message = message;
    this.name = 'NotFoundError';
    this.status = 404;
    this.description = 'The requested resource cannot be found.';
    Error.captureStackTrace(this, NotFoundError);
  }
}

class BadRequestError extends Error {
  constructor(message = 'Bad Request.') {
    super(message);
    this.message = message;
    this.name = 'BadRequestError';
    this.status = 400;
    this.description = 'The request you made is invalid.';
    Error.captureStackTrace(this, BadRequestError);
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Not Authorized.') {
    super(message);
    this.message = message;
    this.name = 'UnauthorizedError';
    this.status = 401;
    this.description = 'You are not authorized to access this resource.';
    Error.captureStackTrace(this, UnauthorizedError);
  }
}

class BadPasswordError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'BadPasswordError';
    Error.captureStackTrace(this, BadPasswordError);
  }
}

class AccountDisabled extends Error {
  constructor(message = 'Account Is Disabled.') {
    super(message);
    this.message = message;
    this.name = 'AccountDisabled';
    this.status = 401;
    Error.captureStackTrace(this, AccountDisabled);
  }
}

class AlreadyExistsError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'AlreadyExistsError';
    this.status = 400;
    Error.captureStackTrace(this, AlreadyExistsError);
  }
}

class FirebaseTransactionDidNotCommitError extends Error {
  constructor(message) {
    super();
    this.name = 'FirebaseTransactionDidNotCommitError';
    Error.captureStackTrace(this, FirebaseTransactionDidNotCommitError);
  }
}

class QuestCantBeMulliganedError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'QuestCantBeMulliganedError';
    Error.captureStackTrace(this, QuestCantBeMulliganedError);
  }
}

class NoNeedForNewBeginnerQuestsError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'NoNeedForNewBeginnerQuestsError';
    Error.captureStackTrace(this, NoNeedForNewBeginnerQuestsError);
  }
}

class InsufficientFundsError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'InsufficientFundsError';
    this.status = 400;
    Error.captureStackTrace(this, InsufficientFundsError);
  }
}

class InvalidInviteCodeError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'InvalidInviteCodeError';
    this.status = 400;
    Error.captureStackTrace(this, InvalidInviteCodeError);
  }
}

class MatchmakingOfflineError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'MatchmakingOfflineError';
    Error.captureStackTrace(this, MatchmakingOfflineError);
  }
}

class InvalidDeckError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'InvalidDeckError';
    Error.captureStackTrace(this, InvalidDeckError);
  }
}

class NoArenaDeckError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'NoArenaDeckError';
    Error.captureStackTrace(this, NoArenaDeckError);
  }
}

class ArenaRewardsAlreadyClaimedError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'ArenaRewardsAlreadyClaimedError';
    Error.captureStackTrace(this, ArenaRewardsAlreadyClaimedError);
  }
}

class InvalidRequestError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'InvalidRequestError';
    Error.captureStackTrace(this, InvalidRequestError);
  }
}

class UnexpectedBadDataError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'UnexpectedBadDataError';
    Error.captureStackTrace(this, UnexpectedBadDataError);
  }
}

class InvalidReferralCodeError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'InvalidReferralCodeError';
    Error.captureStackTrace(this, InvalidReferralCodeError);
  }
}

class MaxFactionXPForSinglePlayerReachedError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'MaxFactionXPForSinglePlayerReachedError';
    Error.captureStackTrace(this, MaxFactionXPForSinglePlayerReachedError);
  }
}

class SinglePlayerModeDisabledError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'SinglePlayerModeDisabledError';
    Error.captureStackTrace(this, SinglePlayerModeDisabledError);
  }
}

class UnverifiedCaptchaError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'UnverifiedCaptchaError';
    Error.captureStackTrace(this, UnverifiedCaptchaError);
  }
}

class DailyChallengeTimeFrameError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'DailyChallengeTimeFrameError';
    Error.captureStackTrace(this, DailyChallengeTimeFrameError);
  }
}

class ChestAndKeyTypeDoNotMatchError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'ChestAndKeyTypeDoNotMatchError';
    Error.captureStackTrace(this, ChestAndKeyTypeDoNotMatchError);
  }
}

class MaxQuantityOfChestTypeError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'MaxQuantityOfChestTypeError';
    Error.captureStackTrace(this, MaxQuantityOfChestTypeError);
  }
}

class SystemDisabledError extends Error {
  constructor(message = 'This system is currently disabled.') {
    super(message);
    this.message = message;
    this.name = 'SystemDisabledError';
    this.status = 400;
    this.description = 'This system is currently disabled.';
    Error.captureStackTrace(this, SystemDisabledError);
  }
}

class MaxOrbsForSetReachedError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'MaxOrbsForSetReachedError';
    Error.captureStackTrace(this, MaxOrbsForSetReachedError);
  }
}

class BossEventNotFound extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'BossEventNotFound';
    Error.captureStackTrace(this, BossEventNotFound);
  }
}

class MaxRiftUpgradesReachedError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'MaxRiftUpgradesReachedError';
    Error.captureStackTrace(this, MaxRiftUpgradesReachedError);
  }
}

class ShopSaleDoesNotExistError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'ShopSaleDoesNotExistError';
    Error.captureStackTrace(this, ShopSaleDoesNotExistError);
  }
}

module.exports.NotFoundError = NotFoundError;
module.exports.BadRequestError = BadRequestError;
module.exports.UnauthorizedError = UnauthorizedError;
module.exports.BadPasswordError = BadPasswordError;
module.exports.AccountDisabled = AccountDisabled;
module.exports.AlreadyExistsError = AlreadyExistsError;
module.exports.QuestCantBeMulliganedError = QuestCantBeMulliganedError;
module.exports.NoNeedForNewBeginnerQuestsError = NoNeedForNewBeginnerQuestsError;
module.exports.FirebaseTransactionDidNotCommitError = FirebaseTransactionDidNotCommitError;
module.exports.InsufficientFundsError = InsufficientFundsError;
module.exports.InvalidInviteCodeError = InvalidInviteCodeError;
module.exports.MatchmakingOfflineError = MatchmakingOfflineError;
module.exports.InvalidDeckError = InvalidDeckError;
module.exports.NoArenaDeckError = NoArenaDeckError;
module.exports.ArenaRewardsAlreadyClaimedError = ArenaRewardsAlreadyClaimedError;
module.exports.InvalidRequestError = InvalidRequestError;
module.exports.UnexpectedBadDataError = UnexpectedBadDataError;
module.exports.InvalidReferralCodeError = InvalidReferralCodeError;
module.exports.MaxFactionXPForSinglePlayerReachedError = MaxFactionXPForSinglePlayerReachedError;
module.exports.SinglePlayerModeDisabledError = SinglePlayerModeDisabledError;
module.exports.UnverifiedCaptchaError = UnverifiedCaptchaError;
module.exports.DailyChallengeTimeFrameError = DailyChallengeTimeFrameError;
module.exports.ChestAndKeyTypeDoNotMatchError = ChestAndKeyTypeDoNotMatchError;
module.exports.MaxQuantityOfChestTypeError = MaxQuantityOfChestTypeError;
module.exports.SystemDisabledError = SystemDisabledError;
module.exports.MaxOrbsForSetReachedError = MaxOrbsForSetReachedError;
module.exports.BossEventNotFound = BossEventNotFound;
module.exports.MaxRiftUpgradesReachedError = MaxRiftUpgradesReachedError;
module.exports.ShopSaleDoesNotExistError = ShopSaleDoesNotExistError;
