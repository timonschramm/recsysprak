import { Interest, Prisma } from "@prisma/client";

import { InterestCategory } from '@prisma/client';
import { SelectionButton } from "../../ui";

interface InterestOptionProps {
    availableInterests: Interest[];
    formData: { interests?: string[] };
    onInterestSelect: (interestId: string) => void;
    maxSelect?: number;
}


const InterestOption: React.FC<InterestOptionProps> = ({
    availableInterests,
    formData,
    onInterestSelect,
    maxSelect = 20
}) => {
    return (
        <div className="space-y-4">
            {Object.entries(availableInterests).map(([category, interests]) => (
                <div key={category} className="space-y-2">
                    <h3 className="font-medium text-primary">
                        {category.split('_').map(word =>
                            word.charAt(0) + word.slice(1).toLowerCase()
                        ).join(' ')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {(interests as unknown as Array<Interest>).map((interest) => (
                            <SelectionButton
                                key={interest.id}
                                isSelected={formData.interests?.includes(interest.id)}
                                onClick={() => onInterestSelect(interest.id)}
                            >
                                {interest.displayName ? interest.displayName : interest.name.split(/(?=[A-Z])/).join(' ')}
                            </SelectionButton>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default InterestOption;