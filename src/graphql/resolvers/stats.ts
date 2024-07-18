import { Context, Stats, StatsTipo, StatsModif } from '../../types';
import CreateError from 'http-errors';
import { StatsRepository } from '../../db/repositories/stats_repo';

export default {
  Query: {
    stats(_: unknown, args: unknown, context: Context): Promise<Stats> {
      return StatsRepository.get(context);
    },

    statsTipo(_: unknown, args:unknown, context: Context): Promise<StatsTipo> {
      const scopes = context.user.scopes;
      if (scopes.includes('Stats:read:mine')) {
        return StatsRepository.getStatsTipo(context.user.id);
      }

      throw new CreateError.Unauthorized(`User[${context.user.id}] is not allowed to perform this operation.`);
    },

    statsModif(_: unknown, args:unknown, context: Context): Promise<StatsModif> {
      const scopes = context.user.scopes;
      if (scopes.includes('Stats:read:mine')) {
        return StatsRepository.getStatsModif(context.user.id);
      }

      throw new CreateError.Unauthorized(`User[${context.user.id}] is not allowed to perform this operation.`);
    },
  },
};
