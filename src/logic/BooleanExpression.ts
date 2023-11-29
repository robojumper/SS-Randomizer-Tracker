export enum Op {
    And = 'and',
    Or = 'or',
}

export type Item = BooleanExpression | string;

class BooleanExpression {
    type: Op;
    items: Item[];

    constructor(items: Item[], type: Op) {
        this.items = items;
        this.type = type;
    }

    static and(...items: Item[]) {
        return new BooleanExpression(items, Op.And);
    }

    static or(...items: Item[]) {
        return new BooleanExpression(items, Op.Or);
    }

    isAnd() {
        return this.type === Op.And;
    }

    isOr() {
        return this.type === Op.Or;
    }

    static isExpression(item: unknown): item is BooleanExpression {
        return typeof item === 'object' && item instanceof BooleanExpression;
    }
}

export default BooleanExpression;
