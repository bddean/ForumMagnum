import { useState, useCallback, useRef } from 'react';
import { useMessages } from '../common/withMessages';
import { useMutation, gql } from '@apollo/client';
import { setVoteClient } from '../../lib/voting/vote';
import { getCollection, getFragmentText } from '../../lib/vulcan-lib';
import * as _ from 'underscore';
import { forumTypeSetting } from '../../lib/instanceSettings';
import {VoteDimensionString} from "../../lib/voting/voteTypes";

const getVoteMutationQuery = (collection: CollectionBase<DbObject>) => {
  const typeName = collection.options.typeName;
  const mutationName = `setVote${typeName}`;
  
  return gql`
    mutation ${mutationName}($documentId: String, $voteType: String) {
      ${mutationName}(documentId: $documentId, voteType: $voteType) {
        ...WithVote${typeName}
      }
    }
    ${getFragmentText(`WithVote${typeName}` as any)}
  `
}

export const useVote = <T extends VoteableTypeClient>(document: T, collectionName: VoteableCollectionName): {
  vote: (props: {document: T, voteType: string|null, voteDimension: VoteDimensionString, collectionName: CollectionNameString, currentUser: UsersCurrent})=>void,
  collectionName: VoteableCollectionName,
  document: T,
  baseScore: number,
  voteCount: number,
} => {
  const messages = useMessages();
  const [optimisticResponseDocument, setOptimisticResponseDocument] = useState<any>(null);
  const mutationCounts = useRef({optimisticMutationIndex: 0, completedMutationIndex: 0});
  const collection = getCollection(collectionName);
  const query = getVoteMutationQuery(collection);
  
  const [mutate] = useMutation(query, {
    onCompleted: useCallback((mutationResult) => {
      if (++mutationCounts.current.completedMutationIndex == mutationCounts.current.optimisticMutationIndex) {
        setOptimisticResponseDocument(null)
      }
    }, []),
  });
  
  const vote = useCallback(async ({document, voteType, voteDimension, collectionName, currentUser}: {
    document: T, voteType: string|null, voteDimension: VoteDimensionString, collectionName: VoteableCollectionName, currentUser: UsersCurrent
  }) => {
    // Cast a vote. Because the vote buttons are easy to mash repeatedly (and
    // the strong-voting mechanic encourages this), there could be multiple
    // overlapping votes in-flight at once. We keep count of how many mutations
    // we've sent out and how many responses we've gotten back, so that the
    // result of an earlier vote does not overwrite the optimistic response of
    // a later vote.
    // FIXME: Currently the server is not guaranteed to process votes in the
    // same order they're received (if they're in separate http requests), which
    // means that if you double-click a vote button, you can get a weird result
    // due to votes being processed out of order.
    
    const newDocument = await setVoteClient({collection, document, user: currentUser, voteType, voteDimension });

    try {
      mutationCounts.current.optimisticMutationIndex++;
      setOptimisticResponseDocument(newDocument);
      await mutate({
        variables: {
          documentId: document._id,
          voteType,
        },
      })
    } catch(e) {
      const errorMessage = _.map(e.graphQLErrors, (gqlErr: any)=>gqlErr.message).join("; ");
      messages.flash({ messageString: errorMessage });
      setOptimisticResponseDocument(null);
    }
  }, [messages, mutate, collection]);
  
  const af = forumTypeSetting.get() === 'AlignmentForum'
  const result = optimisticResponseDocument || document;
  return {
    vote, collectionName,
    document: result,
    baseScore: (af ? result.afBaseScore : result.baseScore) || 0,
    voteCount: (result.voteCount) || 0,
  };
}
