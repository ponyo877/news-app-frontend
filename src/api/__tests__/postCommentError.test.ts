import { classifyPostCommentError } from '@/api/queries';

describe('classifyPostCommentError', () => {
  it('5xxはserver(サーバ側の問題)', () => {
    expect(classifyPostCommentError(500)).toBe('server');
    expect(classifyPostCommentError(502)).toBe('server');
    expect(classifyPostCommentError(503)).toBe('server');
  });

  it('4xxはrejected(リクエスト側の問題)', () => {
    expect(classifyPostCommentError(400)).toBe('rejected');
    expect(classifyPostCommentError(404)).toBe('rejected');
    expect(classifyPostCommentError(422)).toBe('rejected');
  });
});
